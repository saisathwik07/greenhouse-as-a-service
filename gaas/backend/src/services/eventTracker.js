const ActivityEvent = require("../models/ActivityEvent");
const User = require("../models/User");

/**
 * Fire-and-forget event writer. Intentionally swallows errors so a failed
 * audit write can never break a real user request.
 */
async function trackEvent({
  userId,
  type,
  featureKey = "",
  metadata = {},
  req = null,
  user = null,
}) {
  try {
    let userDoc = user;
    if (!userDoc && userId) {
      userDoc = await User.findById(userId).select("name email").lean();
    }
    await ActivityEvent.create({
      userId: userId || null,
      userEmail: userDoc?.email || metadata.email || "",
      userName: userDoc?.name || metadata.name || "",
      type,
      featureKey,
      metadata: metadata || {},
      ip: req ? req.ip || req.headers?.["x-forwarded-for"] || "" : "",
      userAgent: req ? String(req.headers?.["user-agent"] || "").slice(0, 240) : "",
    });
  } catch (err) {
    if (process.env.DEBUG_TRACKER === "1") {
      console.warn("[tracker] dropped event:", type, err.message);
    }
  }
}

/** Update lastActiveAt + loginCount on the User doc. Idempotent failure. */
async function recordLogin(userId, now = new Date()) {
  if (!userId) return;
  try {
    await User.updateOne(
      { _id: userId },
      {
        $set: { lastLoginAt: now, lastActiveAt: now },
        $inc: { loginCount: 1 },
      }
    );
  } catch (err) {
    if (process.env.DEBUG_TRACKER === "1") {
      console.warn("[tracker] recordLogin failed:", err.message);
    }
  }
}

/** Lightweight `lastActiveAt` bump used by the entitlement middleware. */
async function touchUserActivity(userId, now = new Date()) {
  if (!userId) return;
  try {
    await User.updateOne({ _id: userId }, { $set: { lastActiveAt: now } });
  } catch {
    /* ignore */
  }
}

module.exports = { trackEvent, recordLogin, touchUserActivity };
