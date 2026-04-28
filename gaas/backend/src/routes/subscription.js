const express = require("express");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const { authenticate } = require("../middleware/authenticate");
const { applySubscriptionUpgrade } = require("../services/subscriptionService");
const { expireUserPlanIfNeeded } = require("../services/planExpiryService");

const router = express.Router();

/** Maps DB plan to feature tier: free/basic = default tier (live data); pro/standard/premium = full paid. */
function accessRoleFromPlan(plan) {
  const p = String(plan || "basic").toLowerCase();
  if (p === "premium" || p === "standard" || p === "pro") return "premium";
  if (p === "basic" || p === "free" || p === "none") return "basic";
  return "guest";
}

/* GET /api/subscription — logged-in user's plan details */
router.get("/", authenticate, async (req, res, next) => {
  try {
    await expireUserPlanIfNeeded(req.user.id);
    const user = await User.findById(req.user.id)
      .select("role plan planActivatedAt planExpiresAt planStartDate planEndDate walletBalance")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      role: accessRoleFromPlan(user.plan),
      accountRole: user.role || "user",
      plan: user.plan || "basic",
      walletBalance: user.walletBalance || 0,
      planActivatedAt: user.planActivatedAt || user.planStartDate || null,
      planExpiresAt: user.planExpiresAt || user.planEndDate || null,
      planStartDate: user.planStartDate || null,
      planEndDate: user.planEndDate || null,
    });
  } catch (error) {
    next(error);
  }
});

/* GET /api/subscription/history — user purchase + subscription history */
router.get("/history", authenticate, async (req, res, next) => {
  try {
    await expireUserPlanIfNeeded(req.user.id);
    const [payments, subscriptions, user] = await Promise.all([
      PaymentTransaction.find({ userId: req.user.id })
        .populate("planId", "name duration")
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean(),
      Subscription.find({ userId: req.user.id })
        .populate("planId", "name duration")
        .sort({ startDate: -1, createdAt: -1 })
        .lean(),
      User.findById(req.user.id).select("payments").lean(),
    ]);
    res.json({
      payments,
      subscriptions,
      embeddedPayments: user?.payments || [],
    });
  } catch (error) {
    next(error);
  }
});

/* POST /api/subscription/upgrade — { userId, plan, duration } */
router.post("/upgrade", async (req, res, next) => {
  try {
    const { userId, plan, duration } = req.body || {};
    if (!userId || !plan || !duration) {
      return res
        .status(400)
        .json({ error: "userId, plan and duration are required" });
    }
    const user = await applySubscriptionUpgrade({ userId, plan, duration });
    res.json({
      ok: true,
      userId: String(user._id),
      role: user.role,
      plan: user.plan,
      planActivatedAt: user.planActivatedAt,
      planExpiresAt: user.planExpiresAt,
      planStartDate: user.planStartDate,
      planEndDate: user.planEndDate,
    });
  } catch (error) {
    if (String(error.message || "").startsWith("Invalid")) {
      return res.status(400).json({ error: error.message });
    }
    if (String(error.message || "").includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    return next(error);
  }
});

module.exports = router;
