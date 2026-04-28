/**
 * Centralized API configuration.
 *
 * Reads VITE_API_URL from environment. Accepts either a bare origin
 * (e.g. "https://greenhouse-as-a-service.onrender.com") or a value
 * already ending in "/api" (e.g. "/api"). Exposes both forms so that:
 *   - axios baseURL can use `API_URL` (always ends with /api)
 *   - non-axios fetch sites can use `API_BASE_URL` (bare origin or "")
 *
 * Examples:
 *   VITE_API_URL=https://greenhouse-as-a-service.onrender.com
 *     → API_BASE_URL = "https://greenhouse-as-a-service.onrender.com"
 *     → API_URL      = "https://greenhouse-as-a-service.onrender.com/api"
 *
 *   VITE_API_URL=/api          (dev: served via Vite proxy)
 *     → API_BASE_URL = ""
 *     → API_URL      = "/api"
 *
 *   VITE_API_URL=               (unset)
 *     → API_BASE_URL = ""
 *     → API_URL      = "/api"
 */

function readRawEnv() {
  const raw = import.meta.env.VITE_API_URL;
  return typeof raw === "string" ? raw.trim() : "";
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

const RAW = stripTrailingSlash(readRawEnv());

export const API_BASE_URL = RAW.endsWith("/api")
  ? RAW.slice(0, -4)
  : RAW;

export const API_URL = RAW.endsWith("/api")
  ? RAW
  : RAW
    ? `${RAW}/api`
    : "/api";

/** Build a full API URL for fetch() or anywhere outside the axios instance. */
export function apiUrl(path) {
  const p = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${API_URL}${p}`;
}
