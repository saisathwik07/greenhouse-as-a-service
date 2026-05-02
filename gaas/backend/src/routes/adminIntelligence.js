const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const ActivityEvent = require("../models/ActivityEvent");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");
const {
  PLAN_BY_ID,
  USER_TYPE_BY_ID,
  SERVICES,
  ADDONS,
  SERVICE_BY_ID,
  ADDON_BY_ID,
} = require("../config/pricingConfig");

const router = express.Router();

router.use(authenticate, requireAdminRole);

const PURCHASABLE_FEATURE_IDS = [
  ...SERVICES.filter((s) => s.price > 0).map((s) => s.id),
  ...ADDONS.map((a) => a.id),
];
const ALL_FEATURE_IDS = [
  ...SERVICES.map((s) => s.id),
  ...ADDONS.map((a) => a.id),
];

function featureLabel(id) {
  return SERVICE_BY_ID[id]?.label || ADDON_BY_ID[id]?.label || id;
}

function planLabel(id) {
  return PLAN_BY_ID[id]?.label || id || "—";
}

function userTypeLabel(id) {
  return USER_TYPE_BY_ID[id]?.label || id || "—";
}

/**
 * GET /api/admin/users/:id/insights
 * Per-user intelligence drawer: profile, plan, services bought vs not bought,
 * payment history, downloads, login activity, recent events.
 */
router.get("/users/:id/insights", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const [user, subs, txns, downloads, events, activeSub] = await Promise.all([
      User.findById(id).select("-password").lean(),
      Subscription.find({ userId: id }).sort({ startDate: -1, createdAt: -1 }).lean(),
      PaymentTransaction.find({ userId: id })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(50)
        .lean(),
      ActivityEvent.find({ userId: id, type: "download" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      ActivityEvent.find({ userId: id })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      Subscription.findOne({
        userId: id,
        paymentStatus: "success",
        expiryDate: { $gt: new Date() },
      })
        .sort({ startDate: -1 })
        .lean(),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });

    const purchasedSet = new Set([
      ...(activeSub?.selectedServices || []),
      ...(activeSub?.addons || []),
    ]);
    const allTimePurchasedSet = new Set();
    subs.forEach((s) => {
      (s.selectedServices || []).forEach((x) => allTimePurchasedSet.add(x));
      (s.addons || []).forEach((x) => allTimePurchasedSet.add(x));
    });

    const featureUsageAgg = await ActivityEvent.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id), type: "feature_used" } },
      {
        $group: {
          _id: "$featureKey",
          count: { $sum: 1 },
          last: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalSpent = subs
      .filter((s) => s.paymentStatus === "success" || s.paymentStatus === "expired")
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    res.json({
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution || "",
        degree: user.degree || "",
        yearOfStudy: user.yearOfStudy || "",
        department: user.department || "",
        researchDomain: user.researchDomain || "",
        userType: user.userType || activeSub?.userType || "",
        purposeOfUsage: user.purposeOfUsage || "",
        plan: user.plan,
        planLabel: planLabel(activeSub?.planName) || user.plan,
        userTypeLabel: userTypeLabel(user.userType || activeSub?.userType),
        joinDate: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt,
        loginCount: user.loginCount || 0,
        planStartDate: user.planStartDate,
        planEndDate: user.planEndDate,
        walletBalance: user.walletBalance || 0,
      },
      activeSubscription: activeSub
        ? {
            id: String(activeSub._id),
            planName: activeSub.planName,
            duration: activeSub.duration,
            startDate: activeSub.startDate,
            expiryDate: activeSub.expiryDate,
            totalAmount: activeSub.totalAmount,
            selectedServices: activeSub.selectedServices,
            addons: activeSub.addons,
          }
        : null,
      services: {
        owned: Array.from(purchasedSet).map((sid) => ({
          id: sid,
          label: featureLabel(sid),
        })),
        notOwned: ALL_FEATURE_IDS.filter((sid) => !purchasedSet.has(sid)).map((sid) => ({
          id: sid,
          label: featureLabel(sid),
          price:
            SERVICE_BY_ID[sid]?.price ?? ADDON_BY_ID[sid]?.price ?? null,
        })),
        everPurchased: Array.from(allTimePurchasedSet).map((sid) => ({
          id: sid,
          label: featureLabel(sid),
        })),
      },
      featureUsage: featureUsageAgg.map((row) => ({
        featureKey: row._id,
        label: featureLabel(row._id) || row._id,
        count: row.count,
        lastUsed: row.last,
      })),
      paymentHistory: subs.map((s) => ({
        id: String(s._id),
        invoiceNumber: `INV-${String(s._id).slice(-8).toUpperCase()}`,
        planName: s.planName,
        planLabel: planLabel(s.planName),
        duration: s.duration,
        totalAmount: s.totalAmount,
        paymentStatus: s.paymentStatus,
        paymentId: s.paymentId,
        startDate: s.startDate,
        expiryDate: s.expiryDate,
        createdAt: s.createdAt,
      })),
      transactions: txns.map((t) => ({
        id: String(t._id),
        amount: t.amount,
        status: t.status,
        paymentId: t.paymentId,
        orderId: t.orderId,
        paymentDate: t.paymentDate || t.createdAt,
      })),
      downloads: downloads.map((d) => ({
        id: String(d._id),
        kind: d.featureKey || "download",
        metadata: d.metadata || {},
        at: d.createdAt,
      })),
      activity: events.map((e) => ({
        id: String(e._id),
        type: e.type,
        featureKey: e.featureKey || "",
        metadata: e.metadata || {},
        at: e.createdAt,
      })),
      summary: {
        totalSpent: Math.round(totalSpent * 100) / 100,
        invoicesCount: subs.length,
        downloadsCount: await ActivityEvent.countDocuments({
          userId: id,
          type: "download",
        }),
        featureCallsCount: await ActivityEvent.countDocuments({
          userId: id,
          type: "feature_used",
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/funnel
 * Conversion funnel: signup → login → subscription_started → subscription_paid.
 * Counts unique users that reached each step.
 */
router.get("/analytics/funnel", async (_req, res, next) => {
  try {
    const stages = [
      { id: "signup", label: "Signed up" },
      { id: "login", label: "Logged in" },
      { id: "subscription_started", label: "Started checkout" },
      { id: "subscription_paid", label: "Paid" },
    ];

    const counts = await Promise.all(
      stages.map(async ({ id }) => {
        const distinct = await ActivityEvent.distinct("userId", { type: id });
        return distinct.filter(Boolean).length;
      })
    );

    const totalUsers = await User.countDocuments();

    const result = stages.map((s, idx) => ({
      ...s,
      count: counts[idx],
      conversionFromTop: totalUsers ? Math.round((counts[idx] / totalUsers) * 1000) / 10 : 0,
      conversionFromPrev:
        idx === 0
          ? 100
          : counts[idx - 1]
          ? Math.round((counts[idx] / counts[idx - 1]) * 1000) / 10
          : 0,
    }));

    res.json({ totalUsers, stages: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/downloads
 * Dataset download analytics: total, by kind, daily trend (last 30 days),
 * top 10 power users.
 */
router.get("/analytics/downloads", async (_req, res, next) => {
  try {
    const now = new Date();
    const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [byKind, byDay, topUsers, total] = await Promise.all([
      ActivityEvent.aggregate([
        { $match: { type: "download" } },
        { $group: { _id: "$featureKey", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ActivityEvent.aggregate([
        { $match: { type: "download", createdAt: { $gte: fromDate } } },
        {
          $group: {
            _id: {
              y: { $year: "$createdAt" },
              m: { $month: "$createdAt" },
              d: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
      ]),
      ActivityEvent.aggregate([
        { $match: { type: "download" } },
        {
          $group: {
            _id: "$userId",
            count: { $sum: 1 },
            email: { $last: "$userEmail" },
            name: { $last: "$userName" },
            last: { $max: "$createdAt" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ActivityEvent.countDocuments({ type: "download" }),
    ]);

    // Backfill last-30-days array.
    const dayMap = new Map(
      byDay.map((row) => [`${row._id.y}-${row._id.m}-${row._id.d}`, row.count])
    );
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      trend.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        count: dayMap.get(key) || 0,
      });
    }

    res.json({
      total,
      byKind: byKind.map((row) => ({ kind: row._id || "unknown", count: row.count })),
      trend,
      topUsers: topUsers.map((row) => ({
        userId: row._id ? String(row._id) : null,
        name: row.name || "Unknown",
        email: row.email || "—",
        count: row.count,
        lastDownloadAt: row.last,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/features
 * Feature adoption: how many distinct users own each purchasable feature
 * (from active subscriptions) and how many actually called it.
 */
router.get("/analytics/features", async (_req, res, next) => {
  try {
    const now = new Date();
    const activeSubs = await Subscription.find({
      paymentStatus: "success",
      expiryDate: { $gt: now },
    })
      .select("userId selectedServices addons")
      .lean();

    const usersByFeature = new Map();
    activeSubs.forEach((s) => {
      const items = [...(s.selectedServices || []), ...(s.addons || [])];
      items.forEach((id) => {
        if (!usersByFeature.has(id)) usersByFeature.set(id, new Set());
        usersByFeature.get(id).add(String(s.userId));
      });
    });

    const usageAgg = await ActivityEvent.aggregate([
      { $match: { type: "feature_used", featureKey: { $ne: "" } } },
      {
        $group: {
          _id: "$featureKey",
          calls: { $sum: 1 },
          users: { $addToSet: "$userId" },
        },
      },
    ]);

    const usageByFeature = new Map(
      usageAgg.map((row) => [
        row._id,
        { calls: row.calls, users: row.users.filter(Boolean).length },
      ])
    );

    const items = ALL_FEATURE_IDS.map((id) => {
      const ownedBy = usersByFeature.get(id)?.size || 0;
      const usage = usageByFeature.get(featureKeyForFeatureId(id)) || { calls: 0, users: 0 };
      return {
        id,
        label: featureLabel(id),
        kind: SERVICE_BY_ID[id] ? "service" : "addon",
        price:
          SERVICE_BY_ID[id]?.price ?? ADDON_BY_ID[id]?.price ?? null,
        ownedBy,
        callsAllTime: usage.calls,
        callingUsers: usage.users,
        adoption: ownedBy > 0 ? Math.round((usage.users / ownedBy) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.ownedBy - a.ownedBy);

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

/**
 * Maps a wizard service/addon id to the feature key the entitlement
 * middleware records. Mirrors `FEATURE_TO_ITEM` keyed in reverse.
 */
function featureKeyForFeatureId(id) {
  const map = {
    data_as_a_service: "liveData",
    crop_recommendations: "cropRecommendation",
    yield_prediction: "yieldPrediction",
    pest_disease: "pestDisease",
    fertigation_advisory: "fertigation",
    irrigation_scheduling: "irrigation",
    ai_crop_recommendation: "cropRecommendation",
    realtime_iot_dashboard: "mqtt",
    priority_support: "prioritySupport",
  };
  return map[id] || id;
}

/**
 * GET /api/admin/analytics/churn
 * Subscription churn analytics:
 *   - currentlyActive
 *   - churned (expired without a follow-up active sub)
 *   - churnRate (last 30d expirations / active 30d ago)
 *   - cohortByMonth: [{ month, started, churned }]
 *   - atRisk: subs expiring within 7 days
 */
router.get("/analytics/churn", async (_req, res, next) => {
  try {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [currentlyActive, totalPaid, recentlyExpired, atRisk, monthCohorts] = await Promise.all([
      Subscription.countDocuments({
        paymentStatus: "success",
        expiryDate: { $gt: now },
      }),
      Subscription.countDocuments({
        paymentStatus: { $in: ["success", "expired"] },
      }),
      Subscription.find({
        paymentStatus: "expired",
        expiryDate: { $gte: thirtyDaysAgo, $lt: now },
      })
        .select("userId")
        .lean(),
      Subscription.find({
        paymentStatus: "success",
        expiryDate: { $gt: now, $lte: sevenDays },
      })
        .populate("userId", "name email")
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
      Subscription.aggregate([
        {
          $match: {
            startDate: { $ne: null },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$startDate" },
              m: { $month: "$startDate" },
            },
            started: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", ["success", "expired"]] },
                  1,
                  0,
                ],
              },
            },
            churned: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "expired"] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
        { $limit: 12 },
      ]),
    ]);

    // Churned users that still have an active sub aren't really churned.
    const expiredUserIds = recentlyExpired.map((s) => String(s.userId));
    const stillActiveSet = new Set(
      (
        await Subscription.find({
          userId: { $in: expiredUserIds },
          paymentStatus: "success",
          expiryDate: { $gt: now },
        })
          .select("userId")
          .lean()
      ).map((s) => String(s.userId))
    );
    const trueChurnUsers = expiredUserIds.filter((uid) => !stillActiveSet.has(uid));
    const denominator = currentlyActive + trueChurnUsers.length;
    const churnRate30d = denominator
      ? Math.round((trueChurnUsers.length / denominator) * 1000) / 10
      : 0;

    res.json({
      currentlyActive,
      totalPaid,
      churned30d: trueChurnUsers.length,
      churnRate30d,
      atRisk: atRisk.map((s) => ({
        id: String(s._id),
        userName: s.userId?.name || "Unknown",
        userEmail: s.userId?.email || "—",
        planName: s.planName,
        expiryDate: s.expiryDate,
        daysLeft: Math.max(
          0,
          Math.ceil((new Date(s.expiryDate).getTime() - now.getTime()) / 86400000)
        ),
      })),
      cohortByMonth: monthCohorts.map((row) => ({
        label: new Date(row._id.y, row._id.m - 1, 1).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        started: row.started,
        churned: row.churned,
        retained: Math.max(0, row.started - row.churned),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/activity-feed
 * Recent events across the platform for the right-rail live feed.
 * Query: ?limit=30 (max 100), ?since=<ISO> for incremental polling.
 */
router.get("/activity-feed", async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const filter = {};
    if (req.query.since) {
      const d = new Date(req.query.since);
      if (!Number.isNaN(d.getTime())) filter.createdAt = { $gt: d };
    }
    const events = await ActivityEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      events: events.map((e) => ({
        id: String(e._id),
        userId: e.userId ? String(e.userId) : null,
        userName: e.userName || "Unknown",
        userEmail: e.userEmail || "",
        type: e.type,
        featureKey: e.featureKey || "",
        metadata: e.metadata || {},
        at: e.createdAt,
      })),
      asOf: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/role-revenue
 * Revenue by user "role" (which we treat as `userType` from the wizard:
 * student / faculty / researcher).
 */
router.get("/analytics/role-revenue", async (_req, res, next) => {
  try {
    const agg = await Subscription.aggregate([
      { $match: { paymentStatus: { $in: ["success", "expired"] } } },
      {
        $group: {
          _id: "$userType",
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          users: { $addToSet: "$userId" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json({
      byRole: agg.map((row) => ({
        id: row._id || "unknown",
        label: userTypeLabel(row._id),
        revenue: Math.round((row.revenue || 0) * 100) / 100,
        invoices: row.count,
        users: row.users.filter(Boolean).length,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/insights
 * Rules-based "AI" insights that highlight the most actionable signal in
 * the data. Cheap, deterministic, and refreshes on every load.
 */
router.get("/insights", async (_req, res, next) => {
  try {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubs,
      newUsers30d,
      paidLast30d,
      expiringSoon,
      topFeature,
      unusedAggForActive,
      revenue30dAgg,
      featureUsage,
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments({ paymentStatus: "success", expiryDate: { $gt: now } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Subscription.find({
        paymentStatus: "success",
        startDate: { $gte: thirtyDaysAgo },
      })
        .select("totalAmount planName")
        .lean(),
      Subscription.countDocuments({
        paymentStatus: "success",
        expiryDate: { $gt: now, $lte: sevenDays },
      }),
      ActivityEvent.aggregate([
        { $match: { type: "feature_used" } },
        { $group: { _id: "$featureKey", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Subscription.find({
        paymentStatus: "success",
        expiryDate: { $gt: now },
      })
        .select("userId selectedServices addons")
        .lean(),
      ActivityEvent.aggregate([
        {
          $match: {
            type: "subscription_paid",
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$metadata.totalAmount" },
          },
        },
      ]),
      ActivityEvent.aggregate([
        { $match: { type: "feature_used" } },
        {
          $group: {
            _id: { user: "$userId", feature: "$featureKey" },
          },
        },
      ]),
    ]);

    const insights = [];

    if (newUsers30d > 0) {
      insights.push({
        kind: "growth",
        tone: "positive",
        title: `${newUsers30d} new sign-up${newUsers30d === 1 ? "" : "s"} in the last 30 days`,
        body: `${Math.round(
          (newUsers30d / Math.max(1, totalUsers)) * 100
        )}% of your user base joined this month.`,
      });
    }

    const revenue30d = revenue30dAgg[0]?.revenue || 0;
    if (revenue30d > 0) {
      insights.push({
        kind: "revenue",
        tone: "positive",
        title: `₹${Math.round(revenue30d).toLocaleString("en-IN")} collected in the last 30 days`,
        body: `${paidLast30d.length} paid subscription${
          paidLast30d.length === 1 ? "" : "s"
        } closed in this window.`,
      });
    }

    if (expiringSoon > 0) {
      insights.push({
        kind: "churn",
        tone: "warning",
        title: `${expiringSoon} subscription${expiringSoon === 1 ? "" : "s"} expiring within 7 days`,
        body: "Send a renewal nudge to retain ARR.",
      });
    }

    // Highest-paying user-type segment.
    const roleAgg = await Subscription.aggregate([
      { $match: { paymentStatus: { $in: ["success", "expired"] } } },
      { $group: { _id: "$userType", revenue: { $sum: "$totalAmount" } } },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
    ]);
    if (roleAgg[0]?._id) {
      insights.push({
        kind: "segment",
        tone: "info",
        title: `${userTypeLabel(roleAgg[0]._id)} is your strongest segment`,
        body: `₹${Math.round(roleAgg[0].revenue).toLocaleString(
          "en-IN"
        )} lifetime revenue from this user type.`,
      });
    }

    if (topFeature[0]?._id) {
      insights.push({
        kind: "feature",
        tone: "info",
        title: `Most-used feature: ${featureLabel(topFeature[0]._id)}`,
        body: `${topFeature[0].count} call${topFeature[0].count === 1 ? "" : "s"} so far.`,
      });
    }

    // Owned-but-never-used: features with the largest gap between buyers and active users.
    const usedSet = new Set(
      featureUsage.map((row) => `${String(row._id.user)}|${row._id.feature}`)
    );
    const FEATURE_KEY_BY_ID = {
      data_as_a_service: "liveData",
      crop_recommendations: "cropRecommendation",
      yield_prediction: "yieldPrediction",
      pest_disease: "pestDisease",
      fertigation_advisory: "fertigation",
      irrigation_scheduling: "irrigation",
      ai_crop_recommendation: "cropRecommendation",
      realtime_iot_dashboard: "mqtt",
      priority_support: "prioritySupport",
    };
    const gapByFeature = new Map();
    unusedAggForActive.forEach((s) => {
      const owned = [...(s.selectedServices || []), ...(s.addons || [])];
      owned.forEach((fid) => {
        const fk = FEATURE_KEY_BY_ID[fid] || fid;
        const used = usedSet.has(`${String(s.userId)}|${fk}`);
        const cur = gapByFeature.get(fid) || { owners: 0, unused: 0 };
        cur.owners += 1;
        if (!used) cur.unused += 1;
        gapByFeature.set(fid, cur);
      });
    });
    let worstFeature = null;
    gapByFeature.forEach((val, fid) => {
      if (val.owners >= 2 && val.unused / val.owners > 0.5) {
        if (!worstFeature || val.unused > worstFeature.val.unused) {
          worstFeature = { fid, val };
        }
      }
    });
    if (worstFeature) {
      const { fid, val } = worstFeature;
      insights.push({
        kind: "underused",
        tone: "warning",
        title: `${featureLabel(fid)} is underused`,
        body: `${val.unused} of ${val.owners} buyers (${Math.round(
          (val.unused / val.owners) * 100
        )}%) haven't used it yet — consider an onboarding nudge.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        kind: "empty",
        tone: "info",
        title: "Not enough data yet",
        body: "Insights populate after a few days of user activity.",
      });
    }

    res.json({ insights, generatedAt: now });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
