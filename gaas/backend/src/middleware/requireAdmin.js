const { isAdminEmail } = require("../config/authConfig");

/**
 * Requires `authenticate` first. Only admin emails may proceed.
 */
function requireAdmin(req, res, next) {
  const email = (req.user && req.user.email) || "";
  const role = (req.user && req.user.role) || "";
  if (role !== "admin" && !isAdminEmail(email)) {
    return res.status(403).json({ error: "Forbidden", code: "ADMIN_ONLY" });
  }
  return next();
}

module.exports = { requireAdmin };
