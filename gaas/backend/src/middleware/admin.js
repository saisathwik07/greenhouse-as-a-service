/**
 * Requires authenticate first.
 * Only users with JWT role === "admin" may access admin routes.
 */
function requireAdminRole(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({ error: "Forbidden", code: "ADMIN_ONLY" });
  }
  return next();
}

module.exports = { requireAdminRole };
