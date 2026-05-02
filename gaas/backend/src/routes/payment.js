const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");
const { authenticate } = require("../middleware/authenticate");
const {
  computeQuote,
  getPublicConfig,
} = require("../config/pricingConfig");
const {
  createPendingSubscription,
  activatePendingSubscription,
  markSubscriptionFailed,
} = require("../services/subscriptionService");
const { trackEvent } = require("../services/eventTracker");

const router = express.Router();

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

function getRazorpayClient() {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

/**
 * GET /api/payment/pricing-config
 * Public-readable wizard config + GST. Total is *never* trusted from the
 * client; this is for display only.
 */
router.get("/pricing-config", (_req, res) => {
  res.json({
    ...getPublicConfig(),
    razorpayKeyId: KEY_ID || null,
  });
});

/**
 * POST /api/payment/quote
 * Stateless price preview for the wizard's right-side summary panel.
 * Returns the same shape the client computes so we can reconcile mismatches.
 */
router.post("/quote", (req, res) => {
  try {
    const quote = computeQuote(req.body || {});
    res.json({ ok: true, quote });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/payment/create-order
 * Body: { userType, planName, duration, selectedServices[], addons[] }
 *
 * Recomputes price server-side from `pricingConfig`, creates a Razorpay
 * order, and persists a pending Subscription document. Returns the order id
 * + computed quote so the frontend can open Razorpay Checkout.
 */
router.post("/create-order", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let quote;
    try {
      quote = computeQuote(req.body || {});
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    if (quote.totalPaise <= 0) {
      return res.status(400).json({
        error:
          "Total must be greater than zero. Choose at least one paid service or upgrade your plan.",
      });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: quote.totalPaise,
      currency: quote.currency,
      receipt: `gaas_${String(userId).slice(-8)}_${Date.now().toString(36)}`,
      notes: {
        userId: String(userId),
        userType: quote.userType,
        plan: quote.plan,
        duration: quote.duration,
      },
    });

    const subscription = await createPendingSubscription({
      userId,
      userType: quote.userType,
      planName: quote.plan,
      duration: quote.duration,
      selectedServices: quote.selectedServices,
      addons: quote.addons,
      orderId: order.id,
      totalAmount: quote.totalAmount,
      totalPaise: quote.totalPaise,
    });

    trackEvent({
      userId,
      type: "subscription_started",
      featureKey: quote.plan,
      metadata: {
        orderId: order.id,
        totalAmount: quote.totalAmount,
        userType: quote.userType,
        plan: quote.plan,
        duration: quote.duration,
      },
      req,
    });

    return res.json({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: KEY_ID,
      subscriptionId: String(subscription._id),
      quote,
    });
  } catch (error) {
    if (String(error.message || "").includes("Razorpay keys")) {
      return res.status(500).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Verifies HMAC-SHA256 signature, promotes the matching pending Subscription
 * to "success", and unlocks the user's plan tier + entitlements.
 */
router.post("/verify", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    if (!KEY_SECRET) {
      return res.status(500).json({ error: "RAZORPAY_KEY_SECRET is not configured" });
    }

    const expected = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await markSubscriptionFailed({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      }).catch(() => {});
      return res.status(400).json({ ok: false, error: "Invalid payment signature" });
    }

    const { subscription, user } = await activatePendingSubscription({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (String(subscription.userId) !== String(userId)) {
      return res.status(403).json({ error: "Order does not belong to this user" });
    }

    trackEvent({
      userId,
      type: "subscription_paid",
      featureKey: subscription.planName,
      metadata: {
        orderId: subscription.orderId,
        paymentId: razorpay_payment_id,
        totalAmount: subscription.totalAmount,
        plan: subscription.planName,
        duration: subscription.duration,
      },
      req,
    });

    return res.json({
      ok: true,
      verified: true,
      userId: String(user._id),
      plan: user.plan,
      planActivatedAt: user.planActivatedAt,
      planExpiresAt: user.planExpiresAt,
      subscription: {
        id: String(subscription._id),
        userType: subscription.userType,
        planName: subscription.planName,
        duration: subscription.duration,
        selectedServices: subscription.selectedServices,
        addons: subscription.addons,
        totalAmount: subscription.totalAmount,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        paymentStatus: subscription.paymentStatus,
      },
    });
  } catch (error) {
    if (String(error.message || "").includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    return next(error);
  }
});

module.exports = router;
