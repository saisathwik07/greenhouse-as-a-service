/**
 * Requires `authenticate` to run first.
 * Support ticket admin routes: JWT must have `role: "admin"` (case-insensitive).
 * Regular users receive 403 — they cannot list all tickets or post admin replies.
 */
function requireTicketAdmin(req, res, next) {
  const role = String(req.user?.role ?? "").toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({
      error: "Forbidden — admin role required",
      code: "ADMIN_ONLY",
    });
  }
  return next();
}

module.exports = { requireTicketAdmin };
