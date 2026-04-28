/**
 * Resolve a base URL for the Flask AI/IoT-sim service.
 *
 * Dev: use the Vite proxy at "/flask-api" (no CORS, see vite.config.js).
 * Prod: prefer VITE_FLASK_URL, otherwise fall back to the centralized API
 *       origin (`API_BASE_URL` from src/config.js) so deployments only need
 *       a single env var.
 */
import { API_BASE_URL } from "../config";

export function getFlaskBaseUrl() {
  if (import.meta.env.DEV) {
    return "/flask-api";
  }

  const explicit = import.meta.env.VITE_FLASK_URL;
  if (explicit && String(explicit).trim() !== "") {
    return String(explicit).trim().replace(/\/$/, "");
  }

  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  return "http://localhost:5000";
}

export function flaskUrl(path) {
  const base = getFlaskBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
