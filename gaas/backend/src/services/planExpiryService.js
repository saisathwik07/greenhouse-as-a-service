const User = require("../models/User");

const PAID_PLANS = ["basic", "pro", "standard", "premium"];

/**
 * Downgrades user to free if planEndDate or legacy planExpiresAt is in the past.
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

module.exports = { expireUserPlanIfNeeded, PAID_PLANS };
