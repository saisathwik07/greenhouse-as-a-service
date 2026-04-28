/**
 * In Vite dev, use proxy path (same origin as the app) so CORS is not required.
 * In production, call Flask directly (ensure CORS on Flask or same host).
 */
export function getFlaskBaseUrl() {
  if (import.meta.env.DEV) {
    return "/flask-api";
  }
  return import.meta.env.VITE_FLASK_URL?.replace(/\/$/, "") || "http://localhost:5000";
}

export function flaskUrl(path) {
  const base = getFlaskBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
