const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");
const { authenticate } = require("../middleware/authenticate");
const Plan = require("../models/Plan");
const PaymentTransaction = require("../models/PaymentTransaction");
const { activateUserPlanFromPayment } = require("../services/subscriptionService");

const router = express.Router();

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

function getRazorpayClient() {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

const DURATION_TO_DAYS = { monthly: 30, quarterly: 90, yearly: 365 };

async function resolvePlan({ plan, duration, amount }) {
  const name = String(plan || "").trim();
  if (!["Basic", "Pro", "Premium"].includes(name)) {
    throw new Error("Invalid plan. Use Basic, Pro, or Premium");
  }
  const days = DURATION_TO_DAYS[String(duration || "").toLowerCase()];
  if (!days) {
    throw new Error("Invalid duration. Use monthly, quarterly, or yearly");
  }

  let planDoc = await Plan.findOne({ name, duration: days, price: Number(amount) / 100 });
  if (!planDoc) {
    planDoc = await Plan.create({
      name,
      price: Number(amount) / 100,
      duration: days,
      features: [],
    });
  }
  return planDoc;
}

router.post("/create-order", authenticate, async (req, res, next) => {
  try {
    const { amount, currency = "INR", plan, duration, userId } = req.body || {};
    const effectiveUserId = req.user?.id || userId;
    if (!amount || !plan || !duration || !effectiveUserId) {
      return res
        .status(400)
        .json({ error: "amount, plan, duration and userId are required" });
    }
    const amountPaise = Number(amount);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ error: "amount must be a positive integer (paise)" });
    }

    const planDoc = await resolvePlan({ plan, duration, amount: amountPaise });
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: String(currency || "INR").toUpperCase(),
      receipt: `gaas_${String(effectiveUserId).slice(-8)}_${Date.now().toString(36)}`,
      notes: {
        plan: String(plan),
        duration: String(duration),
        userId: String(effectiveUserId),
        planId: String(planDoc._id),
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: KEY_ID,
      planId: String(planDoc._id),
    });
  } catch (error) {
    if (String(error.message || "").startsWith("Invalid")) {
      return res.status(400).json({ error: error.message });
    }
    if (String(error.message || "").includes("Razorpay keys")) {
      return res.status(500).json({ error: error.message });
    }
    return next(error);
  }
});

router.post("/verify", authenticate, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      plan,
      duration,
      planId,
    } = req.body || {};
    const effectiveUserId = req.user?.id || userId;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !effectiveUserId ||
      !plan ||
      !duration ||
      !planId
    ) {
      return res.status(400).json({
        error:
          "razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan, duration and planId are required",
      });
    }

    if (!KEY_SECRET) {
      return res.status(500).json({ error: "RAZORPAY_KEY_SECRET is not configured" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await PaymentTransaction.create({
        userId: effectiveUserId,
        planId,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: 0,
        status: "failed",
        paymentDate: new Date(),
      }).catch(() => {});
      return res.status(400).json({ ok: false, error: "Invalid payment signature" });
    }

    const planDoc = await Plan.findById(planId);
    if (!planDoc) {
      return res.status(404).json({ error: "Plan not found" });
    }
    const amountPaise = Number(req.body?.amount || 0) || Math.round(Number(planDoc.price) * 100);

    const { user } = await activateUserPlanFromPayment({
      userId: effectiveUserId,
      planId: planDoc._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amountPaise,
      status: "success",
    });

    const walletCredit = Number(req.body?.walletCredit || 0);
    if (Number.isFinite(walletCredit) && walletCredit > 0) {
      user.walletBalance = Number(user.walletBalance || 0) + walletCredit;
      await user.save();
    }

    return res.json({
      ok: true,
      verified: true,
      userId: String(user._id),
      role: user.role,
      plan: user.plan,
      planActivatedAt: user.planActivatedAt,
      planExpiresAt: user.planExpiresAt,
      planStartDate: user.planStartDate,
      planEndDate: user.planEndDate,
      walletBalance: user.walletBalance || 0,
      paymentId: razorpay_payment_id,
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
