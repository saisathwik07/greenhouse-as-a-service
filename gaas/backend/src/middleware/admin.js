const User = require("../models/User");

/**
 * Requires authenticate first.
 * Checks JWT role first, then falls back to DB lookup for dynamically promoted admins.
 */
async function requireAdminRole(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "admin") return next();

  // JWT may have stale role — check database
  try {
    const dbUser = await User.findById(req.user?.id).select("role").lean();
    if (dbUser && dbUser.role === "admin") {
      req.user.role = "admin";
      return next();
    }
  } catch {
    /* DB error — fall through to forbidden */
  }

  return res.status(403).json({ error: "Forbidden", code: "ADMIN_ONLY" });
}

module.exports = { requireAdminRole };
