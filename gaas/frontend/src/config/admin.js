/**
 * Must match backend `ADMIN_EMAIL` / `src/config/authConfig.js`.
 * Override with VITE_ADMIN_EMAIL for different environments.
 */
export const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || "saisathwik123456@gmail.com"
).toLowerCase();

export function isAdminUser(user) {
  if (!user?.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL;
}
