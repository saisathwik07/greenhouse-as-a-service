/**
 * Must match backend `ADMIN_EMAIL` / `src/config/authConfig.js`.
 * Override with VITE_ADMIN_EMAIL for different environments.
 * Supports comma-separated emails.
 */
const adminEmailsRaw = (
  import.meta.env.VITE_ADMIN_EMAIL || "saisathwik123456@gmail.com,kitswadmin123@gmail.com"
).toLowerCase();
const ADMIN_EMAILS = new Set(adminEmailsRaw.split(",").map((e) => e.trim()).filter(Boolean));

export const ADMIN_EMAIL = ADMIN_EMAILS.values().next().value;

export function isAdminUser(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS.has(user.email.toLowerCase()) || user.role === "admin";
}
