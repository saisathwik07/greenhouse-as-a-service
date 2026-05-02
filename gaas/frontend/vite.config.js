import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  /** Express (gaas/backend) — auth, admin, sensors. Must match `PORT` in backend `.env` (default 5100). */
  const NODE_API = env.VITE_DEV_NODE_URL || "http://127.0.0.1:5100";
  /** Flask (crop_api / app.py) — must be :5000, NOT Express :5100. */
  const FLASK = env.VITE_DEV_FLASK_URL || "http://127.0.0.1:5000";
  /**
   * Yield ML always uses port 5000 unless overridden. (If VITE_DEV_FLASK_URL points at
   * Express by mistake, /api/yield would 404 — this keeps yield working.)
   */
  const FLASK_YIELD = env.VITE_YIELD_FLASK_URL || "http://127.0.0.1:5000";
  const YIELD_API = env.VITE_YIELD_API_URL || FLASK;

  /**
   * Express (`gaas/backend`) owns almost all `/api/*` routes (auth, sensors, tickets, …).
   * Express proxies `/api/yield/*` to Flask when needed. Do not send generic `/api` to Flask
   * or the React app will hit the wrong service in dev.
   */
  const proxy = {
    "/api/auth": { target: NODE_API, changeOrigin: true },
    "/api/admin": { target: NODE_API, changeOrigin: true },
    "/api/subscription": { target: NODE_API, changeOrigin: true },
    "/api/payment": { target: NODE_API, changeOrigin: true },
    "/api/yield": { target: FLASK_YIELD, changeOrigin: true },
    "/yield-api": {
      target: YIELD_API,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/yield-api/, ""),
    },
    "/flask-api": {
      target: FLASK,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/flask-api/, ""),
    },
    "/api": { target: NODE_API, changeOrigin: true },
    /** Static screenshots/attachments served by Express. */
    "/uploads": { target: NODE_API, changeOrigin: true },
  };

  return {
    plugins: [react()],
    // Fixed port so Google OAuth "Authorized JavaScript origins" stay valid (avoid silent :5174).
    // Free port 5173 or set VITE_DEV_PORT — must match origins in Google Cloud Console.
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      strictPort: true,
      proxy,
    },
    preview: { proxy },
  };
});
