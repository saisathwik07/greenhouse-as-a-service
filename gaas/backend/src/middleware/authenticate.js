const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../config/authConfig");

/**
 * Verifies `Authorization: Bearer <JWT>` and attaches `req.user = { id, email, role }`.
 * Accepts payload `id` or `sub` (legacy).
 *
 * Also rejects requests from accounts the admin has blocked, so a stolen or
 * pre-existing JWT cannot be used after the user is suspended. Admins are
 * exempt from this check to avoid locking themselves out.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (process.env.DEBUG_AUTH === "1") {
    console.log("[auth] authenticate:", req.method, req.path, "Authorization:", token ? "Bearer ***" : "missing");
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    if (process.env.DEBUG_AUTH === "1") {
      console.warn("[auth] JWT verify failed:", err.message);
    }
    return res.status(401).json({ error: "Invalid or expired token", code: "INVALID_TOKEN" });
  }

  const id = decoded.id || decoded.sub;
  const role = String(decoded.role || "user").toLowerCase();
  if (process.env.DEBUG_AUTH === "1") {
    console.log("[auth] JWT decoded user id=%s role=%s", id, role);
  }

  req.user = {
    id,
    email: String(decoded.email || "").toLowerCase(),
    role,
  };

  if (!id || role === "admin") {
    return next();
  }

  User.findById(id)
    .select("isBlocked blockedReason role")
    .lean()
    .then((user) => {
      if (!user) {
        return res
          .status(401)
          .json({ error: "Account no longer exists", code: "USER_REMOVED" });
      }
      if (user.isBlocked && String(user.role || "").toLowerCase() !== "admin") {
        return res.status(403).json({
          error:
            "Your account has been suspended. Please contact support.",
          code: "ACCOUNT_BLOCKED",
          reason: user.blockedReason || "",
        });
      }
      return next();
    })
    .catch((err) => {
      console.error("[auth] block-state check failed:", err.message);
      return next();
    });
}

module.exports = { authenticate };
