const express = require("express");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");
const { listUsers, updateUserPlan } = require("../controllers/adminController");

const router = express.Router();

router.get("/users", authenticate, requireAdminRole, listUsers);
router.put("/update-plan/:userId", authenticate, requireAdminRole, updateUserPlan);

router.get("/payments", authenticate, requireAdminRole, async (_req, res) => {
  try {
    const payments = await PaymentTransaction.find()
      .populate("userId", "name email")
      .populate("planId", "name")
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const rows = payments.map((p) => ({
      id: String(p._id),
      userName: p.userId?.name || "Unknown",
      userEmail: p.userId?.email || "-",
      planName: p.planId?.name || "-",
      amount: p.amount,
      status: p.status,
      paymentId: p.paymentId,
      orderId: p.orderId,
      paymentDate: p.paymentDate || p.createdAt,
    }));
    return res.json({ payments: rows });
  } catch (err) {
    console.error("[admin/payments]", err);
    return res.status(500).json({ error: "Failed to load payments", detail: err.message });
  }
});

router.get("/subscriptions", authenticate, requireAdminRole, async (_req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("userId", "name email")
      .populate("planId", "name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean();

    const rows = subscriptions.map((s) => ({
      id: String(s._id),
      userName: s.userId?.name || "Unknown",
      userEmail: s.userId?.email || "-",
      planName: s.planId?.name || "-",
      status: s.status,
      amount: s.amount,
      startDate: s.startDate,
      expiryDate: s.expiryDate,
      paymentId: s.paymentId,
      orderId: s.orderId,
    }));
    return res.json({ subscriptions: rows });
  } catch (err) {
    console.error("[admin/subscriptions]", err);
    return res.status(500).json({ error: "Failed to load subscriptions", detail: err.message });
  }
});

module.exports = router;
