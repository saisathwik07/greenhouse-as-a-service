const { isAdminEmail } = require("../config/authConfig");
const User = require("../models/User");

/**
 * Requires `authenticate` first. Only admin emails or admin role may proceed.
 * Falls back to DB lookup for dynamically promoted admins.
 */
async function requireAdmin(req, res, next) {
  const email = (req.user && req.user.email) || "";
  const role = (req.user && req.user.role) || "";

  if (role === "admin" || isAdminEmail(email)) return next();

  // JWT may have stale role — check database
  try {
    const dbUser = await User.findById(req.user?.id).select("role").lean();
    if (dbUser && dbUser.role === "admin") {
      req.user.role = "admin";
      return next();
    }
  } catch {
    /* fall through */
  }

  return res.status(403).json({ error: "Forbidden", code: "ADMIN_ONLY" });
}

module.exports = { requireAdmin };
