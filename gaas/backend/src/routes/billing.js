const express = require("express");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const { authenticate } = require("../middleware/authenticate");
const {
  expireUserPlanIfNeeded,
} = require("../services/planExpiryService");
const {
  getActiveSubscription,
} = require("../services/subscriptionService");
const {
  PLAN_BY_ID,
  USER_TYPE_BY_ID,
  DURATION_BY_ID,
  SERVICE_BY_ID,
  ADDON_BY_ID,
} = require("../config/pricingConfig");

const router = express.Router();

function describeSubscription(sub) {
  if (!sub) return null;
  const plan = PLAN_BY_ID[sub.planName] || null;
  const userType = USER_TYPE_BY_ID[sub.userType] || null;
  const duration = DURATION_BY_ID[sub.duration] || null;
  return {
    id: String(sub._id),
    invoiceNumber: `INV-${String(sub._id).slice(-8).toUpperCase()}`,
    userType: sub.userType,
    userTypeLabel: userType?.label || sub.userType,
    planName: sub.planName,
    planLabel: plan?.label || sub.planName,
    duration: sub.duration,
    durationLabel: duration?.label || sub.duration,
    selectedServices: (sub.selectedServices || []).map((id) => ({
      id,
      label: SERVICE_BY_ID[id]?.label || id,
      price: SERVICE_BY_ID[id]?.price ?? null,
    })),
    addons: (sub.addons || []).map((id) => ({
      id,
      label: ADDON_BY_ID[id]?.label || id,
      price: ADDON_BY_ID[id]?.price ?? null,
    })),
    totalAmount: sub.totalAmount,
    amountPaise: sub.amount,
    paymentStatus: sub.paymentStatus,
    paymentId: sub.paymentId,
    orderId: sub.orderId,
    startDate: sub.startDate,
    expiryDate: sub.expiryDate,
    createdAt: sub.createdAt,
  };
}

/**
 * GET /api/billing
 * Returns the logged-in user's invoices (Subscription docs created by the
 * wizard) plus raw Razorpay transactions for reconciliation.
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await expireUserPlanIfNeeded(userId);

    const [subs, txns, active] = await Promise.all([
      Subscription.find({ userId })
        .sort({ createdAt: -1 })
        .lean(),
      PaymentTransaction.find({ userId })
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean(),
      getActiveSubscription(userId),
    ]);

    const totalPaid = subs
      .filter((s) => s.paymentStatus === "success" || s.paymentStatus === "expired")
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    res.json({
      activeSubscription: describeSubscription(active),
      invoices: subs.map(describeSubscription),
      transactions: txns.map((t) => ({
        id: String(t._id),
        amount: t.amount,
        status: t.status,
        paymentId: t.paymentId,
        orderId: t.orderId,
        paymentDate: t.paymentDate || t.createdAt,
      })),
      summary: {
        invoicesCount: subs.length,
        totalPaid,
        currency: "INR",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/invoice/:id
 * Single invoice detail (only the owner can read it).
 */
router.get("/invoice/:id", authenticate, async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ error: "Invoice not found" });
    if (String(sub.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not your invoice" });
    }
    res.json({ invoice: describeSubscription(sub) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
