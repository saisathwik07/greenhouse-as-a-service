/**
 * Central auth settings. Override via environment in production.
 */
const jwt = require("jsonwebtoken");

const HARDCODED_ADMINS = ["saisathwik123456@gmail.com", "kitswadmin123@gmail.com"];
const envAdmins = (process.env.ADMIN_EMAIL || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
const adminEmails = new Set([...HARDCODED_ADMINS, ...envAdmins]);
/** Check if an email is an admin email. */
function isAdminEmail(email) {
  return adminEmails.has(String(email || "").toLowerCase().trim());
}
const adminEmail = adminEmails.values().next().value; // Primary admin (backwards compat)
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
  isAdminEmail,
  jwtSecret,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  signAccessToken,
};
