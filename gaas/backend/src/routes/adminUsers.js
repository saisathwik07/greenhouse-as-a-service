const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");
const ActivityEvent = require("../models/ActivityEvent");
const Notification = require("../models/Notification");
const Ticket = require("../models/Ticket");
const AdminAuditLog = require("../models/AdminAuditLog");
const { authenticate } = require("../middleware/authenticate");
const { requireAdminRole } = require("../middleware/admin");
const { writeAdminAudit } = require("../services/adminAudit");
const {
  applySubscriptionUpgrade,
  computeExpiryFromDuration,
  DURATION_DAYS,
} = require("../services/subscriptionService");

const router = express.Router();

router.use(authenticate, requireAdminRole);

const VALID_PLANS = new Set(["free", "basic", "pro"]);
const VALID_SUB_ACTIONS = new Set([
  "upgrade",
  "downgrade",
  "extend",
  "cancel",
]);

function planRank(plan) {
  switch (String(plan || "").toLowerCase()) {
    case "free":
      return 0;
    case "basic":
      return 1;
    case "pro":
    case "premium":
    case "standard":
      return 2;
    default:
      return -1;
  }
}

function notifySafe(userId, payload) {
  if (!userId) return Promise.resolve();
  return Notification.create({ user: userId, ...payload }).catch((err) => {
    if (process.env.DEBUG_TRACKER === "1") {
      console.warn("[adminUsers] notify failed:", err.message);
    }
  });
}

function isSelf(req, targetId) {
  return String(req.user?.id || "") === String(targetId);
}

async function loadTarget(id, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return null;
  }
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

function publicProfile(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    planStartDate: user.planStartDate ?? user.planActivatedAt ?? null,
    planEndDate: user.planEndDate ?? user.planExpiresAt ?? null,
    isBlocked: !!user.isBlocked,
    blockedAt: user.blockedAt || null,
    blockedReason: user.blockedReason || "",
    quotaResetAt: user.quotaResetAt || null,
    walletBalance: user.walletBalance || 0,
  };
}

/**
 * POST /api/admin/users/:id/block
 * Body: { reason? }
 * Marks the account as suspended. The next request from this user (or login
 * attempt) is rejected with 403 ACCOUNT_BLOCKED. Admins cannot block other
 * admins or themselves.
 */
router.post("/users/:id/block", async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id, res);
    if (!target) return;

    if (String(target.role || "").toLowerCase() === "admin") {
      return res
        .status(403)
        .json({ error: "Admin accounts cannot be blocked" });
    }
    if (isSelf(req, target._id)) {
      return res.status(403).json({ error: "You cannot block yourself" });
    }
    if (target.isBlocked) {
      return res.json({ ok: true, user: publicProfile(target), already: true });
    }

    const reason = String(req.body?.reason || "").trim().slice(0, 240);

    target.isBlocked = true;
    target.blockedAt = new Date();
    target.blockedReason = reason;
    target.blockedBy = req.user?.id || null;
    await target.save();

    await writeAdminAudit({
      req,
      action: "user_blocked",
      target,
      metadata: { reason },
    });

    notifySafe(target._id, {
      type: "ticket_status",
      title: "Account suspended",
      body: reason
        ? `An administrator suspended your account: ${reason}`
        : "An administrator suspended your account.",
      link: "/profile",
    });

    res.json({ ok: true, user: publicProfile(target) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/unblock
 * Clears suspension and lets the user log in again.
 */
router.post("/users/:id/unblock", async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id, res);
    if (!target) return;

    if (!target.isBlocked) {
      return res.json({ ok: true, user: publicProfile(target), already: true });
    }

    target.isBlocked = false;
    target.blockedAt = null;
    target.blockedReason = "";
    target.blockedBy = null;
    await target.save();

    await writeAdminAudit({
      req,
      action: "user_unblocked",
      target,
    });

    notifySafe(target._id, {
      type: "ticket_status",
      title: "Account reinstated",
      body: "Your account has been reinstated. You can log in again.",
      link: "/profile",
    });

    res.json({ ok: true, user: publicProfile(target) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Body: { confirmEmail? }
 * Permanently deletes the user document and cascades cleanup of related
 * collections: subscriptions, payment transactions, activity events,
 * notifications, and tickets. Audit row is written *before* the user row is
 * removed so we keep a record of who deleted whom.
 */
router.delete("/users/:id", async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id, res);
    if (!target) return;

    if (String(target.role || "").toLowerCase() === "admin") {
      return res
        .status(403)
        .json({ error: "Admin accounts cannot be deleted from this UI" });
    }
    if (isSelf(req, target._id)) {
      return res.status(403).json({ error: "You cannot delete yourself" });
    }

    const expectedEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();
    if (expectedEmail && expectedEmail !== String(target.email || "").toLowerCase()) {
      return res.status(400).json({
        error: "confirmEmail does not match the target user's email",
      });
    }

    const snapshot = publicProfile(target);

    await writeAdminAudit({
      req,
      action: "user_deleted",
      target,
      metadata: { snapshot, reason: String(req.body?.reason || "").slice(0, 240) },
    });

    const userId = target._id;
    const cleanup = await Promise.allSettled([
      Subscription.deleteMany({ userId }),
      PaymentTransaction.deleteMany({ userId }),
      ActivityEvent.deleteMany({ userId }),
      Notification.deleteMany({ user: userId }),
      Ticket.deleteMany({ user: userId }),
    ]);

    await User.deleteOne({ _id: userId });

    const counts = {
      subscriptions: cleanup[0].status === "fulfilled" ? cleanup[0].value.deletedCount : 0,
      payments: cleanup[1].status === "fulfilled" ? cleanup[1].value.deletedCount : 0,
      activity: cleanup[2].status === "fulfilled" ? cleanup[2].value.deletedCount : 0,
      notifications: cleanup[3].status === "fulfilled" ? cleanup[3].value.deletedCount : 0,
      tickets: cleanup[4].status === "fulfilled" ? cleanup[4].value.deletedCount : 0,
    };

    res.json({ ok: true, deleted: snapshot, cleanup: counts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/subscription
 * Body: { action: 'upgrade'|'downgrade'|'extend'|'cancel',
 *         plan?, durationDays?, addDays?, reason? }
 *
 * - upgrade   : set to a higher tier (free → basic → pro). Requires `plan` and `durationDays` (days > 0).
 * - downgrade : set to a lower tier. Requires `plan` and `durationDays`.
 * - extend    : add `addDays` to the current planEndDate (or starts a new window from now).
 * - cancel    : revert to free tier and clear all expiry dates.
 */
router.post("/users/:id/subscription", async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id, res);
    if (!target) return;

    const action = String(req.body?.action || "").toLowerCase();
    if (!VALID_SUB_ACTIONS.has(action)) {
      return res.status(400).json({
        error: `action must be one of: ${[...VALID_SUB_ACTIONS].join(", ")}`,
      });
    }

    const before = {
      plan: target.plan,
      planStartDate: target.planStartDate,
      planEndDate: target.planEndDate,
    };

    let updated;
    let auditAction = "plan_updated";
    const meta = { before, action };

    if (action === "cancel") {
      target.plan = "free";
      target.planStartDate = null;
      target.planEndDate = null;
      target.planActivatedAt = null;
      target.planExpiresAt = null;
      await target.save();
      updated = target;
      auditAction = "subscription_cancelled";

      await Subscription.updateMany(
        { userId: target._id, paymentStatus: "success", expiryDate: { $gt: new Date() } },
        { $set: { paymentStatus: "expired", status: "expired" } }
      ).catch(() => {});
    } else if (action === "extend") {
      const addDays = Number(req.body?.addDays);
      if (!Number.isFinite(addDays) || addDays <= 0 || addDays > 3650) {
        return res
          .status(400)
          .json({ error: "addDays must be a positive number (max 3650)" });
      }
      const now = new Date();
      const base =
        target.planEndDate && new Date(target.planEndDate).getTime() > now.getTime()
          ? new Date(target.planEndDate)
          : now;
      const newEnd = new Date(base.getTime() + addDays * 24 * 60 * 60 * 1000);
      target.planEndDate = newEnd;
      target.planExpiresAt = newEnd;
      if (!target.planStartDate) {
        target.planStartDate = now;
        target.planActivatedAt = now;
      }
      if (!target.plan || target.plan === "free") {
        target.plan = "basic";
      }
      await target.save();
      updated = target;
      auditAction = "subscription_extended";
      meta.addDays = addDays;
      meta.newEnd = newEnd;

      await Subscription.findOneAndUpdate(
        { userId: target._id, paymentStatus: "success" },
        { $set: { expiryDate: newEnd } },
        { sort: { expiryDate: -1 } }
      ).catch(() => {});
    } else {
      // upgrade or downgrade
      const plan = String(req.body?.plan || "").toLowerCase();
      if (!VALID_PLANS.has(plan)) {
        return res
          .status(400)
          .json({ error: "plan must be one of: free, basic, pro" });
      }
      const durationDays = Number(req.body?.durationDays);
      if (plan !== "free" && (!Number.isFinite(durationDays) || durationDays <= 0)) {
        return res
          .status(400)
          .json({ error: "durationDays must be > 0 for paid plans" });
      }

      const fromRank = planRank(target.plan);
      const toRank = planRank(plan);
      if (action === "upgrade" && toRank <= fromRank) {
        return res
          .status(400)
          .json({ error: "Upgrade target plan is not higher than the current plan" });
      }
      if (action === "downgrade" && toRank >= fromRank) {
        return res
          .status(400)
          .json({ error: "Downgrade target plan is not lower than the current plan" });
      }

      // Pick a duration string the helper understands when possible, else
      // compute a custom expiry off durationDays.
      const inferredDuration =
        Object.entries(DURATION_DAYS).find(([, d]) => d === durationDays)?.[0] || null;

      if (plan === "free") {
        await applySubscriptionUpgrade({
          userId: target._id,
          plan: "free",
          duration: null,
        });
      } else if (inferredDuration) {
        await applySubscriptionUpgrade({
          userId: target._id,
          plan,
          duration: inferredDuration,
        });
      } else {
        const now = new Date();
        const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        await User.updateOne(
          { _id: target._id },
          {
            $set: {
              plan,
              planStartDate: now,
              planEndDate: end,
              planActivatedAt: now,
              planExpiresAt: end,
            },
          }
        );
      }

      updated = await User.findById(target._id);
      auditAction =
        action === "upgrade"
          ? "subscription_upgraded"
          : "subscription_downgraded";
      meta.plan = plan;
      meta.durationDays = durationDays;
    }

    meta.after = {
      plan: updated.plan,
      planStartDate: updated.planStartDate,
      planEndDate: updated.planEndDate,
    };
    if (req.body?.reason) {
      meta.reason = String(req.body.reason).slice(0, 240);
    }

    await writeAdminAudit({
      req,
      action: auditAction,
      target: updated,
      metadata: meta,
    });

    notifySafe(updated._id, {
      type: "ticket_status",
      title: "Subscription updated",
      body:
        action === "cancel"
          ? "An administrator cancelled your subscription."
          : action === "extend"
          ? `An administrator extended your subscription until ${new Date(
              updated.planEndDate
            ).toLocaleDateString()}.`
          : `An administrator changed your plan to ${updated.plan}.`,
      link: "/subscription",
    });

    res.json({ ok: true, user: publicProfile(updated), action: auditAction });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/reset-quota
 * Sets quotaResetAt = now so all `feature_used` events recorded before this
 * moment are excluded from the user's quota. Audit row records the previous
 * count for the on-screen "before / after" display.
 */
router.post("/users/:id/reset-quota", async (req, res, next) => {
  try {
    const target = await loadTarget(req.params.id, res);
    if (!target) return;

    const now = new Date();
    const previousCount = await ActivityEvent.countDocuments({
      userId: target._id,
      type: "feature_used",
      ...(target.quotaResetAt
        ? { createdAt: { $gt: target.quotaResetAt } }
        : {}),
    });

    target.quotaResetAt = now;
    await target.save();

    await writeAdminAudit({
      req,
      action: "quota_reset",
      target,
      metadata: {
        previousCount,
        resetAt: now,
        reason: String(req.body?.reason || "").slice(0, 240),
      },
    });

    notifySafe(target._id, {
      type: "ticket_status",
      title: "Usage quota reset",
      body: "An administrator reset your usage quota.",
      link: "/profile",
    });

    res.json({
      ok: true,
      user: publicProfile(target),
      previousCount,
      resetAt: now,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:id/audit-logs
 * Paginated audit history scoped to a single target user.
 */
router.get("/users/:id/audit-logs", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const logs = await AdminAuditLog.find({ targetUserId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      logs: logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        metadata: l.metadata || {},
        ip: l.ip,
        at: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/audit-logs
 * Global audit history (most recent first). Used by the admin dashboard.
 */
router.get("/audit-logs", async (req, res, next) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const logs = await AdminAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      logs: logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        targetUserId: l.targetUserId ? String(l.targetUserId) : null,
        targetUserEmail: l.targetUserEmail,
        metadata: l.metadata || {},
        ip: l.ip,
        at: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
