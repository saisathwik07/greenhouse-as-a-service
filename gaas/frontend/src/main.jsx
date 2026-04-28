import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";
import App from "./App.jsx";

// Set VITE_GOOGLE_CLIENT_ID in .env (Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID, Web application).
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

if (import.meta.env.DEV && googleClientId && typeof window !== "undefined") {
  const o = window.location.origin;
  // eslint-disable-next-line no-console
  console.info(
    `%c[GAAS OAuth]%c Error 400 origin_mismatch? In Google Cloud → Credentials → THIS client ID (${googleClientId.slice(0, 12)}…)\n` +
      `  → Authorized JavaScript origins → Add URI → exactly:\n  %c${o}%c\n` +
      `(no path, no trailing slash; localhost and 127.0.0.1 are different.)`,
    "font-weight:bold;color:#0d9488",
    "",
    "font-weight:bold;font-family:monospace",
    ""
  );
}

function AppTree() {
  const inner = (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
  if (!googleClientId) return inner;
  return <GoogleOAuthProvider clientId={googleClientId}>{inner}</GoogleOAuthProvider>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppTree />
  </StrictMode>
);
