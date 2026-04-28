import axios from "axios";
import { API_URL, API_BASE_URL } from "./config";

/** Canonical key for app JWT (backend Bearer token). */
export const AUTH_TOKEN_KEY = "token";

/** @deprecated Use AUTH_TOKEN_KEY — kept for older code paths */
export const GAAS_JWT_TOKEN_KEY = "gaas-jwt-token";

const GOOGLE_ID_TOKEN_STORAGE_KEY = "gaas-google-id-token";
const GAAS_SESSION_KEY = "gaas-session";

/** Single in-flight refresh so parallel API calls don't spam google-login */
let ensureJwtPromise = null;

export function getAuthToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(GAAS_JWT_TOKEN_KEY);
}

export function storeAuthToken(token) {
  if (!token || typeof localStorage === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(GAAS_JWT_TOKEN_KEY, token);
}

export function clearAuthTokens() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(GAAS_JWT_TOKEN_KEY);
}

export function clearAuthSessionAndTokens() {
  clearAuthTokens();
  try {
    localStorage.removeItem(GAAS_SESSION_KEY);
    localStorage.removeItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSessionUserAndSyncJwt() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(GAAS_SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u?.appJwt && typeof u.appJwt === "string") {
      storeAuthToken(u.appJwt);
    }
    return u;
  } catch {
    return null;
  }
}

function persistAppJwtToSession(token) {
  try {
    const raw = localStorage.getItem(GAAS_SESSION_KEY);
    if (!raw) return;
    const u = JSON.parse(raw);
    u.appJwt = token;
    localStorage.setItem(GAAS_SESSION_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

function isAuthRequestUrl(url) {
  const u = String(url || "");
  return (
    u.includes("google-login") ||
    u.includes("/auth/login") ||
    u.includes("/auth/register")
  );
}

/**
 * Exchange Google ID token for app JWT. Deduplicated; clears stale Google token if exchange fails (401).
 */
export async function ensureAppJwtFromGoogleIdToken() {
  if (typeof localStorage === "undefined") return false;

  loadSessionUserAndSyncJwt();
  if (getAuthToken()) return true;

  const idToken = localStorage.getItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
  if (!idToken) return false;

  if (ensureJwtPromise) return ensureJwtPromise;

  ensureJwtPromise = (async () => {
    const maxAttempts = 3;
    const delayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data } = await api.post("/auth/google-login", { idToken });
        if (data?.token) {
          storeAuthToken(data.token);
          persistAppJwtToSession(data.token);
          return true;
        }
        console.warn("[api] ensureAppJwtFromGoogleIdToken: no token in response", data);
      } catch (e) {
        const status = e.response?.status;
        const msg = e.response?.data?.error || e.message;
        console.error(
          `[api] ensureAppJwtFromGoogleIdToken attempt ${attempt}/${maxAttempts}:`,
          status,
          msg
        );
        if (status === 401 || status === 400) {
          console.warn("[api] Google ID token invalid or expired — clearing stored ID token");
          try {
            localStorage.removeItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
          } catch {
            /* ignore */
          }
          return false;
        }
        if (attempt < maxAttempts && (status >= 500 || !e.response)) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }
    }
    return false;
  })();

  try {
    return await ensureJwtPromise;
  } finally {
    ensureJwtPromise = null;
  }
}

/**
 * Single source of truth for axios baseURL. `API_URL` always ends with /api
 * so existing call sites like `api.get("/sensors/realtime")` keep working in
 * both dev (Vite proxy → /api) and production (Render → https://…/api).
 */
export const api = axios.create({
  baseURL: API_URL,
});

if (typeof window !== "undefined" && import.meta.env.DEV) {
  console.info(
    `[api] axios baseURL=${API_URL} (origin=${API_BASE_URL || "(relative)"})`
  );
}

/**
 * Before each request: if no app JWT but a Google ID token exists, mint JWT first.
 * Skips auth endpoints to avoid recursion.
 */
api.interceptors.request.use(async (config) => {
  const url = String(config.url || "");
  if (!isAuthRequestUrl(url) && !getAuthToken()) {
    const googleId = localStorage.getItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
    if (googleId) {
      await ensureAppJwtFromGoogleIdToken();
    }
  }
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || "");
    const isAuthRoute =
      url.includes("/auth/google-login") ||
      url.includes("/auth/login") ||
      url.includes("/auth/register");

    if (!error.response) {
      const reason = error.code || error.message || "network error";
      console.error(
        `[api] Network error calling ${url} via baseURL=${API_URL}: ${reason}`
      );
    } else if (status >= 500) {
      console.error(`[api] Server error ${status} on ${url}`);
    }

    if (status === 401 && !isAuthRoute && getAuthToken()) {
      console.warn("[api] 401 — clearing session and redirecting to login");
      clearAuthSessionAndTokens();
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

/** User-facing hint when API session cannot be established */
export const API_SESSION_HELP =
  "Your Google sign-in session for the server may have expired (tokens last ~1 hour). Use Sign out, then sign in with Google again. If it keeps failing, check that the backend is running (port 5100) and Vite proxies /api to it.";
