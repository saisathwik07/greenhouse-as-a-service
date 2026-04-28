/**
 * Central auth settings. Override via environment in production.
 */
const jwt = require("jsonwebtoken");

const adminEmail = (process.env.ADMIN_EMAIL || "saisathwik123456@gmail.com").toLowerCase();
const jwtSecret = process.env.JWT_SECRET || "gaas-dev-secret-change-in-production";

/**
 * Access token: 7 days. Payload includes `id` + `role` (+ `sub` + `email` for compatibility).
 */
function signAccessToken(user) {
  const id = String(user._id ?? user.id);
  const payload = {
    id,
    sub: id,
    role: user.role,
    email: user.email,
  };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
  if (process.env.DEBUG_AUTH === "1") {
    console.log("[auth] JWT generated for user id=%s role=%s", payload.id, payload.role);
  }
  return token;
}

module.exports = {
  adminEmail,
  jwtSecret,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  signAccessToken,
};
