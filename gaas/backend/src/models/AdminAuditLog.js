const mongoose = require("mongoose");

/**
 * Append-only audit trail for privileged admin actions on user accounts.
 *
 * Every block / unblock / delete / plan-change / quota-reset writes one row
 * here so the platform owner can answer "who did what to whom and when" long
 * after the action completed. Writes are best-effort: a failed log row never
 * blocks the underlying admin action (the route logs the warning and moves on).
 */
const ADMIN_AUDIT_ACTIONS = [
  "user_blocked",
  "user_unblocked",
  "user_deleted",
  "subscription_upgraded",
  "subscription_downgraded",
  "subscription_extended",
  "subscription_cancelled",
  "quota_reset",
  "plan_updated",
];

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: { type: String, default: "", lowercase: true, trim: true },
    actorRole: { type: String, default: "admin" },

    /** The user the action was performed against (may be null after delete). */
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetUserEmail: { type: String, default: "", lowercase: true, trim: true },

    action: {
      type: String,
      enum: ADMIN_AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    /** Free-form details: { plan, durationDays, reason, before, after, ... }. */
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", adminAuditLogSchema);
module.exports.ADMIN_AUDIT_ACTIONS = ADMIN_AUDIT_ACTIONS;
