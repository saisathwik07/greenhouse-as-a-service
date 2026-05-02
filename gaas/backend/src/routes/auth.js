const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { adminEmail, jwtSecret, googleClientId, signAccessToken } = require("../config/authConfig");
const { expireUserPlanIfNeeded } = require("../services/planExpiryService");
const { trackEvent, recordLogin } = require("../services/eventTracker");

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(String(password), 10);
    const role = normalizedEmail === adminEmail ? "admin" : "user";
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      plan: "basic",
      walletBalance: 0,
      lastLoginAt: new Date(),
    });

    const token = signAccessToken(user);
    await Promise.all([
      trackEvent({ userId: user._id, type: "signup", req, user }),
      trackEvent({ userId: user._id, type: "login", req, user }),
      recordLogin(user._id),
    ]);
    const userOut = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      plan: user.plan,
    };
    return res.status(201).json({ user: userOut, token });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      await trackEvent({
        type: "login_failed",
        metadata: { email: normalizedEmail },
        req,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();
    await Promise.all([
      trackEvent({ userId: user._id, type: "login", req, user }),
      recordLogin(user._id),
      expireUserPlanIfNeeded(user._id),
    ]);
    const fresh = await User.findById(user._id).select("-password").lean();

    const token = signAccessToken(fresh);
    const userOut = {
      id: fresh._id,
      name: fresh.name,
      email: fresh.email,
      role: fresh.role,
      walletBalance: fresh.walletBalance,
      plan: fresh.plan,
      planExpiresAt: fresh.planExpiresAt || fresh.planEndDate || null,
      planStartDate: fresh.planStartDate || null,
      planEndDate: fresh.planEndDate || null,
    };
    return res.json({ user: userOut, token });
  } catch (err) {
    console.error("[auth/login]", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/google-login
 * Body: { idToken: string } — Google ID token from @react-oauth/google
 * Verifies with Google, upserts user, returns app JWT. All errors are caught; server must not crash.
 */
router.post("/google-login", async (req, res) => {
  try {
    const idToken = req.body?.idToken;
    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      return res.status(400).json({ error: "idToken is required" });
    }

    const audience = process.env.GOOGLE_CLIENT_ID || googleClientId;
    if (!audience) {
      console.error("[auth/google-login] GOOGLE_CLIENT_ID is not set in environment");
      return res.status(500).json({
        error: "Server is missing GOOGLE_CLIENT_ID",
      });
    }

    if (!jwtSecret) {
      console.error("[auth/google-login] JWT_SECRET is not set");
      return res.status(500).json({ error: "Server is missing JWT_SECRET" });
    }

    const client = new OAuth2Client(audience);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience,
      });
    } catch (verifyErr) {
      console.error("[auth/google-login] verifyIdToken failed:", verifyErr.message);
      console.error(verifyErr.stack);
      return res.status(401).json({
        error: "Invalid or expired Google ID token",
      });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      console.error("[auth/google-login] Google ticket has no payload");
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    const email = String(payload.email || "")
      .toLowerCase()
      .trim();
    if (!email) {
      return res.status(400).json({ error: "Google token has no email" });
    }

    const name = String(payload.name || email.split("@")[0]).trim();
    const picture = payload.picture ? String(payload.picture) : "";
    const now = new Date();
    const role = email === adminEmail ? "admin" : "user";

    /** Paid tiers — do not downgrade on Google re-login */
    const paidPlans = new Set(["pro", "premium", "standard"]);

    let user;
    let isNewSignup = false;
    try {
      user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            name,
            picture,
            role,
            lastLoginAt: now,
          },
        },
        { new: true }
      );
      if (user) {
        // Only update plan if not already on a paid plan
        const current = String(user.plan || "").toLowerCase();
        if (!paidPlans.has(current)) {
          user.plan = "basic";
          await User.updateOne({ _id: user._id }, { $set: { plan: "basic" } });
        }
      } else {
        isNewSignup = true;
        user = await User.create({
          name,
          email,
          role,
          picture,
          plan: "basic",
          lastLoginAt: now,
        });
      }
    } catch (dbErr) {
      console.error("[auth/google-login] MongoDB error:", dbErr.message);
      console.error(dbErr.stack);
      return res.status(500).json({ error: dbErr.message });
    }

    await Promise.all([
      isNewSignup
        ? trackEvent({ userId: user._id, type: "signup", req, user })
        : Promise.resolve(),
      trackEvent({ userId: user._id, type: "login", req, user }),
      recordLogin(user._id),
      expireUserPlanIfNeeded(user._id),
    ]);
    user = await User.findById(user._id).select("-password").lean();

    let jwtToken;
    try {
      jwtToken = signAccessToken(user);
    } catch (jwtErr) {
      console.error("[auth/google-login] jwt.sign failed:", jwtErr.message);
      console.error(jwtErr.stack);
      return res.status(500).json({ error: jwtErr.message });
    }

    const userOut = {
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      plan: user.plan,
      planActivatedAt: user.planActivatedAt || user.planStartDate || null,
      planExpiresAt: user.planExpiresAt || user.planEndDate || null,
      planStartDate: user.planStartDate || null,
      planEndDate: user.planEndDate || null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    return res.json({ user: userOut, token: jwtToken });
  } catch (err) {
    console.error("[auth/google-login] Unhandled error:", err.message);
    console.error(err.stack);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
