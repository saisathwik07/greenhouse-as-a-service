const express = require("express");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");
const { listUsers, updateUserPlan } = require("../controllers/adminController");
const {
  PLAN_BY_ID,
  USER_TYPE_BY_ID,
} = require("../config/pricingConfig");

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

/**
 * GET /api/admin/analytics/revenue
 * Revenue analytics for the admin dashboard. All amounts in rupees.
 *
 * Returns:
 *   - totals: lifetime revenue, paid invoice count, active sub count
 *   - mrr / arr: normalised to monthly + annual recurring revenue
 *   - byPlan: revenue + count per plan (starter / pro / enterprise)
 *   - byUserType: revenue per user type
 *   - byMonth: revenue trend for last 12 months
 *   - recent: 10 latest paid invoices
 */
router.get("/analytics/revenue", authenticate, requireAdminRole, async (_req, res, next) => {
  try {
    const now = new Date();
    const monthsBack = 12;
    const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

    const PAID = { paymentStatus: { $in: ["success", "expired"] } };
    const ACTIVE = { paymentStatus: "success", expiryDate: { $gt: now } };

    const [totals, byPlanAgg, byUserTypeAgg, byMonthAgg, mrrAgg, recent, activeCount, totalUsers] =
      await Promise.all([
        Subscription.aggregate([
          { $match: PAID },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              paidInvoices: { $sum: 1 },
            },
          },
        ]),
        Subscription.aggregate([
          { $match: PAID },
          {
            $group: {
              _id: "$planName",
              revenue: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ]),
        Subscription.aggregate([
          { $match: PAID },
          {
            $group: {
              _id: "$userType",
              revenue: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ]),
        Subscription.aggregate([
          {
            $match: {
              ...PAID,
              startDate: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: {
                y: { $year: "$startDate" },
                m: { $month: "$startDate" },
              },
              revenue: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.y": 1, "_id.m": 1 } },
        ]),
        // MRR: sum of (totalAmount / months) for currently-active subs.
        Subscription.aggregate([
          { $match: ACTIVE },
          {
            $project: {
              totalAmount: 1,
              months: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$duration", "monthly"] }, then: 1 },
                    { case: { $eq: ["$duration", "quarterly"] }, then: 3 },
                    { case: { $eq: ["$duration", "yearly"] }, then: 12 },
                  ],
                  default: 1,
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              mrr: {
                $sum: { $divide: ["$totalAmount", "$months"] },
              },
            },
          },
        ]),
        Subscription.find(PAID)
          .populate("userId", "name email")
          .sort({ startDate: -1, createdAt: -1 })
          .limit(10)
          .lean(),
        Subscription.countDocuments(ACTIVE),
        User.countDocuments(),
      ]);

    const totalRevenue = totals[0]?.totalRevenue || 0;
    const paidInvoices = totals[0]?.paidInvoices || 0;
    const mrr = Math.round((mrrAgg[0]?.mrr || 0) * 100) / 100;

    const planLabel = (id) => PLAN_BY_ID[id]?.label || id || "Unknown";
    const userTypeLabel = (id) => USER_TYPE_BY_ID[id]?.label || id || "Unknown";

    // Backfill missing months as zero so the chart has a continuous x-axis.
    const monthMap = new Map(
      byMonthAgg.map((row) => [`${row._id.y}-${row._id.m}`, row])
    );
    const byMonth = [];
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const found = monthMap.get(key);
      byMonth.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        revenue: Math.round((found?.revenue || 0) * 100) / 100,
        count: found?.count || 0,
      });
    }

    res.json({
      asOf: now,
      totals: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        paidInvoices,
        activeSubscriptions: activeCount,
        totalUsers,
        currency: "INR",
      },
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      byPlan: byPlanAgg.map((row) => ({
        id: row._id,
        label: planLabel(row._id),
        revenue: Math.round((row.revenue || 0) * 100) / 100,
        count: row.count,
      })),
      byUserType: byUserTypeAgg.map((row) => ({
        id: row._id,
        label: userTypeLabel(row._id),
        revenue: Math.round((row.revenue || 0) * 100) / 100,
        count: row.count,
      })),
      byMonth,
      recent: recent.map((s) => ({
        id: String(s._id),
        userName: s.userId?.name || "Unknown",
        userEmail: s.userId?.email || "-",
        userType: s.userType,
        planName: s.planName,
        planLabel: planLabel(s.planName),
        duration: s.duration,
        totalAmount: s.totalAmount,
        startDate: s.startDate,
        expiryDate: s.expiryDate,
        paymentStatus: s.paymentStatus,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
