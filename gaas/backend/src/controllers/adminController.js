const mongoose = require("mongoose");
const User = require("../models/User");

const VALID_PLANS = ["free", "basic", "pro"];

function normalizePlanLabel(p) {
  const m = { none: "free", standard: "pro", premium: "pro" };
  return m[p] || p;
}

/**
 * GET /api/admin/users
 * Query: page, limit, q (email search)
 */
async function listUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const q = (req.query.q || "").trim().toLowerCase();

    const filter = q ? { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ lastLoginAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password")
        .lean(),
      User.countDocuments(filter),
    ]);

    const sanitized = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      plan: normalizePlanLabel(u.plan),
      planStartDate: u.planStartDate ?? u.planActivatedAt ?? null,
      planEndDate: u.planEndDate ?? u.planExpiresAt ?? null,
      walletBalance: u.walletBalance ?? 0,
      payments: Array.isArray(u.payments) ? u.payments : [],
      picture: u.picture,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      isBlocked: !!u.isBlocked,
      blockedAt: u.blockedAt || null,
    }));

    return res.json({
      users: sanitized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error("[adminController.listUsers]", err);
    return res.status(500).json({ error: "Failed to load users", detail: err.message });
  }
}

/**
 * PUT /api/admin/update-plan/:userId
 * Body: { plan, durationDays }
 */
async function updateUserPlan(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const { plan, durationDays } = req.body || {};

    if (!VALID_PLANS.includes(String(plan || "").toLowerCase())) {
      return res.status(400).json({ error: "plan must be one of: free, basic, pro" });
    }

    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 0) {
      return res.status(400).json({ error: "durationDays must be a non-negative number" });
    }

    const normalizedPlan = String(plan).toLowerCase();
    const now = new Date();

    let update;
    if (normalizedPlan === "free") {
      update = {
        $set: {
          plan: "free",
          planStartDate: null,
          planEndDate: null,
          planActivatedAt: null,
          planExpiresAt: null,
        },
      };
    } else {
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      update = {
        $set: {
          plan: normalizedPlan,
          planStartDate: now,
          planEndDate: end,
          planActivatedAt: now,
          planExpiresAt: end,
        },
      };
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        planStartDate: user.planStartDate,
        planEndDate: user.planEndDate,
        payments: user.payments || [],
      },
    });
  } catch (err) {
    console.error("[adminController.updateUserPlan]", err);
    return res.status(500).json({ error: "Failed to update plan", detail: err.message });
  }
}

module.exports = { listUsers, updateUserPlan, VALID_PLANS };
