const User = require("../models/User");
const Subscription = require("../models/Subscription");

const PAID_PLANS = ["basic", "pro", "standard", "premium"];

/**
 * Downgrades a single user to free if their plan window has elapsed. Cheap
 * enough to call per-request (used by /api/auth and /api/subscription).
 */
async function expireUserPlanIfNeeded(userId) {
  if (!userId) return;
  const now = new Date();

  await User.updateOne(
    {
      _id: userId,
      $or: [
        { planEndDate: { $exists: true, $ne: null, $lt: now } },
        { planExpiresAt: { $exists: true, $ne: null, $lt: now } },
      ],
      plan: { $in: PAID_PLANS },
    },
    {
      $set: {
        plan: "free",
        planStartDate: null,
        planEndDate: null,
        planActivatedAt: null,
        planExpiresAt: null,
      },
    }
  );
}

/**
 * Bulk sweeper. Run on server boot and on a 30-minute timer so users who
 * never log in are still moved to free. Returns a summary for logging.
 */
async function expireOverduePlansForAllUsers(now = new Date()) {
  const userResult = await User.updateMany(
    {
      $or: [
        { planEndDate: { $exists: true, $ne: null, $lt: now } },
        { planExpiresAt: { $exists: true, $ne: null, $lt: now } },
      ],
      plan: { $in: PAID_PLANS },
    },
    {
      $set: {
        plan: "free",
        planStartDate: null,
        planEndDate: null,
        planActivatedAt: null,
        planExpiresAt: null,
      },
    }
  );

  // Mark expired wizard subscriptions so the latest-active query stops
  // returning them. We keep `paymentStatus="success"` for accounting and
  // introduce a separate `expired` value via the existing enum-friendly fields.
  const subResult = await Subscription.updateMany(
    {
      paymentStatus: "success",
      expiryDate: { $ne: null, $lt: now },
    },
    { $set: { paymentStatus: "expired", status: "expired" } }
  );

  return {
    usersDowngraded: userResult?.modifiedCount || 0,
    subscriptionsExpired: subResult?.modifiedCount || 0,
    at: now,
  };
}

/**
 * Start a periodic sweeper. Idempotent: keeps a single timer per process.
 * Default interval = 30 minutes. Returns the timer handle.
 */
let _expirySweeperHandle = null;
function startExpirySweeper({ intervalMs = 30 * 60 * 1000, runImmediately = true } = {}) {
  if (_expirySweeperHandle) return _expirySweeperHandle;

  const tick = async () => {
    try {
      const summary = await expireOverduePlansForAllUsers();
      if (summary.usersDowngraded || summary.subscriptionsExpired) {
        console.log(
          `[expiry] downgraded=${summary.usersDowngraded} subs_expired=${summary.subscriptionsExpired}`
        );
      }
    } catch (err) {
      console.error("[expiry] sweep failed:", err.message);
    }
  };

  if (runImmediately) {
    tick();
  }
  _expirySweeperHandle = setInterval(tick, intervalMs);
  if (typeof _expirySweeperHandle.unref === "function") {
    _expirySweeperHandle.unref();
  }
  return _expirySweeperHandle;
}

module.exports = {
  expireUserPlanIfNeeded,
  expireOverduePlansForAllUsers,
  startExpirySweeper,
  PAID_PLANS,
};
