const User = require("../models/User");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");

const DURATION_DAYS = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function mapProductNameToUserPlan(planName) {
  const n = String(planName || "").toLowerCase();
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

module.exports = {
  DURATION_DAYS,
  computeExpiryFromDuration,
  applySubscriptionUpgrade,
  activateUserPlanFromPayment,
  mapProductNameToUserPlan,
};
