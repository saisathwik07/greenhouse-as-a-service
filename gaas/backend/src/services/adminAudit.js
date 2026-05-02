const AdminAuditLog = require("../models/AdminAuditLog");

/**
 * Write a single admin-action audit row. Fire-and-forget: a failed log
 * write must never bubble up and break the admin operation that produced
 * it. Errors are logged at warn level when DEBUG_TRACKER=1.
 *
 * @param {Object} params
 * @param {Object} params.req           Express request (used for ip / UA / actor).
 * @param {string} params.action        One of AdminAuditLog.ADMIN_AUDIT_ACTIONS.
 * @param {Object} [params.target]      Target user doc (or { id, email }).
 * @param {Object} [params.metadata]    Extra structured detail for the row.
 */
async function writeAdminAudit({ req, action, target = null, metadata = {} }) {
  try {
    const actor = req?.user || {};
    const targetId =
      target?._id ?? target?.id ?? target?.userId ?? null;
    const targetEmail =
      target?.email ?? target?.userEmail ?? "";

    await AdminAuditLog.create({
      actorId: actor.id || null,
      actorEmail: actor.email || "",
      actorRole: actor.role || "admin",
      targetUserId: targetId,
      targetUserEmail: targetEmail,
      action,
      metadata: metadata || {},
      ip: req ? req.ip || req.headers?.["x-forwarded-for"] || "" : "",
      userAgent: req
        ? String(req.headers?.["user-agent"] || "").slice(0, 240)
        : "",
    });
  } catch (err) {
    if (process.env.DEBUG_TRACKER === "1") {
      console.warn("[audit] dropped admin action:", action, err.message);
    }
  }
}

module.exports = { writeAdminAudit };
