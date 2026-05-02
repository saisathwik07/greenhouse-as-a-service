const User = require("../models/User");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const { PLAN_BY_ID } = require("../config/pricingConfig");

const DURATION_DAYS = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function mapProductNameToUserPlan(planName) {
  const n = String(planName || "").toLowerCase();
  if (PLAN_BY_ID[n]) return PLAN_BY_ID[n].userPlan;
  if (n === "basic") return "basic";
  if (n === "pro" || n === "premium") return "pro";
  return "pro";
}

function computeExpiryFromDuration(duration, now = new Date()) {
  const days = DURATION_DAYS[String(duration || "").toLowerCase()];
  if (!days) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

async function applySubscriptionUpgrade({ userId, plan, duration, now = new Date() }) {
  const normalizedPlan = String(plan || "").toLowerCase();
  const allowed = ["free", "basic", "pro", "none", "standard", "premium"];
  if (!allowed.includes(normalizedPlan)) {
    throw new Error("Invalid plan. Use one of: free, basic, pro");
  }

  const userPlan =
    normalizedPlan === "none"
      ? "free"
      : normalizedPlan === "standard" || normalizedPlan === "premium"
      ? "pro"
      : normalizedPlan;

  if (userPlan === "free") {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          plan: "free",
          planStartDate: null,
          planEndDate: null,
          planActivatedAt: null,
          planExpiresAt: null,
        },
      },
      { new: true }
    );
    if (!user) throw new Error("User not found");
    return user;
  }

  const expiresAt = computeExpiryFromDuration(duration, now);
  if (!expiresAt) {
    throw new Error("Invalid duration. Use one of: monthly, quarterly, yearly");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: userPlan,
        planStartDate: now,
        planEndDate: expiresAt,
        planActivatedAt: now,
        planExpiresAt: expiresAt,
      },
    },
    { new: true }
  );

  if (!user) throw new Error("User not found");
  return user;
}

async function activateUserPlanFromPayment({
  userId,
  planId,
  paymentId,
  orderId,
  amount,
  status = "success",
  now = new Date(),
}) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  const durationDays = Number(plan.duration) > 0 ? Number(plan.duration) : 30;
  const startDate = now;
  const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const userPlan = mapProductNameToUserPlan(plan.name);

  user.plan = userPlan;
  user.planStartDate = startDate;
  user.planEndDate = expiryDate;
  user.planActivatedAt = startDate;
  user.planExpiresAt = expiryDate;

  user.payments.push({
    razorpay_payment_id: paymentId,
    amount,
    plan: userPlan,
    date: now,
  });

  await user.save();

  const subscription = await Subscription.create({
    userId: user._id,
    planId: plan._id,
    paymentId,
    orderId,
    amount,
    status,
    startDate,
    expiryDate,
  });

  await PaymentTransaction.create({
    userId: user._id,
    planId: plan._id,
    paymentId,
    orderId,
    amount,
    status,
    paymentDate: now,
  });

  return { user, plan, subscription };
}

/**
 * Multi-step wizard flow: persist a pending Subscription doc *before* opening
 * Razorpay so we can correlate the order even if the user never finishes
 * checkout (and so we have an audit trail of intent).
 */
async function createPendingSubscription({
  userId,
  userType,
  planName,
  duration,
  selectedServices,
  addons,
  orderId,
  totalAmount,
  totalPaise,
}) {
  return Subscription.create({
    userId,
    planId: null,
    userType,
    planName,
    duration,
    selectedServices: Array.isArray(selectedServices) ? selectedServices : [],
    addons: Array.isArray(addons) ? addons : [],
    orderId,
    paymentId: "",
    signature: "",
    totalAmount,
    amount: totalPaise,
    paymentStatus: "pending",
    status: "pending",
    startDate: null,
    expiryDate: null,
  });
}

/**
 * Promote a pending Subscription to success after Razorpay signature verifies.
 * Updates the embedded user payment list and unlocks the corresponding plan
 * tier on the User document so the existing legacy gates keep working.
 */
async function activatePendingSubscription({
  orderId,
  paymentId,
  signature,
  now = new Date(),
}) {
  const subscription = await Subscription.findOne({ orderId });
  if (!subscription) throw new Error("Subscription not found for order");
  if (subscription.paymentStatus === "success") {
    const user = await User.findById(subscription.userId);
    return { subscription, user };
  }

  const days =
    DURATION_DAYS[String(subscription.duration || "").toLowerCase()] || 30;
  const startDate = now;
  const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  subscription.paymentId = paymentId || "";
  subscription.signature = signature || "";
  subscription.paymentStatus = "success";
  subscription.status = "success";
  subscription.startDate = startDate;
  subscription.expiryDate = expiryDate;
  await subscription.save();

  const user = await User.findById(subscription.userId);
  if (!user) throw new Error("User not found");

  const userPlan = mapProductNameToUserPlan(subscription.planName);
  user.plan = userPlan;
  user.planStartDate = startDate;
  user.planEndDate = expiryDate;
  user.planActivatedAt = startDate;
  user.planExpiresAt = expiryDate;
  user.payments.push({
    razorpay_payment_id: paymentId || "",
    amount: subscription.amount,
    plan: userPlan,
    date: now,
  });
  await user.save();

  await PaymentTransaction.create({
    userId: user._id,
    planId: subscription.planId || undefined,
    paymentId: paymentId || "",
    orderId,
    amount: subscription.amount,
    status: "success",
    paymentDate: now,
  }).catch(() => {});

  return { subscription, user };
}

async function markSubscriptionFailed({ orderId, paymentId, signature }) {
  const subscription = await Subscription.findOne({ orderId });
  if (!subscription) return null;
  subscription.paymentId = paymentId || subscription.paymentId;
  subscription.signature = signature || subscription.signature;
  subscription.paymentStatus = "failed";
  subscription.status = "failed";
  await subscription.save();
  return subscription;
}

/** Latest successful subscription for a user (for entitlement reads). */
async function getActiveSubscription(userId, now = new Date()) {
  return Subscription.findOne({
    userId,
    paymentStatus: "success",
    expiryDate: { $gt: now },
  })
    .sort({ startDate: -1, createdAt: -1 })
    .lean();
}

module.exports = {
  DURATION_DAYS,
  computeExpiryFromDuration,
  applySubscriptionUpgrade,
  activateUserPlanFromPayment,
  mapProductNameToUserPlan,
  createPendingSubscription,
  activatePendingSubscription,
  markSubscriptionFailed,
  getActiveSubscription,
};
