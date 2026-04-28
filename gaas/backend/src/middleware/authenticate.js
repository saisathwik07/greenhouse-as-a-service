const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/authConfig");

/**
 * Verifies `Authorization: Bearer <JWT>` and attaches `req.user = { id, email, role }`.
 * Accepts payload `id` or `sub` (legacy).
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
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const id = decoded.id || decoded.sub;
    if (process.env.DEBUG_AUTH === "1") {
      console.log("[auth] JWT decoded user id=%s role=%s", id, decoded.role);
    }
    req.user = {
      id,
      email: String(decoded.email || "").toLowerCase(),
      role: String(decoded.role || "user").toLowerCase(),
    };
    return next();
  } catch (err) {
    if (process.env.DEBUG_AUTH === "1") {
      console.warn("[auth] JWT verify failed:", err.message);
    }
    return res.status(401).json({ error: "Invalid or expired token", code: "INVALID_TOKEN" });
  }
}

module.exports = { authenticate };
