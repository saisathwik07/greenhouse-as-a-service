import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import {
  api,
  clearAuthSessionAndTokens,
  ensureAppJwtFromGoogleIdToken,
  loadSessionUserAndSyncJwt,
  storeAuthToken,
} from "../api";
import { isAdminUser } from "../config/admin";

const AuthContext = createContext(null);

/** Persisted Google ID token (cleared on logout). */
export const GOOGLE_ID_TOKEN_KEY = "gaas-google-id-token";

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem("gaas-users") || "{}");
  } catch { return {}; }
}

function storeUsers(users) {
  localStorage.setItem("gaas-users", JSON.stringify(users));
}

export function AuthProvider({ children }) {
  /** Sync `appJwt` from session into localStorage before first paint (see `loadSessionUserAndSyncJwt`). */
  const [user, setUser] = useState(() => loadSessionUserAndSyncJwt());
  const [loading, setLoading] = useState(true);

  // Finish auth bootstrap: exchange Google id token for app JWT before showing protected routes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user?.provider === "google") {
          await ensureAppJwtFromGoogleIdToken();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist session JSON (name, email, picture, roles, etc.)
  const saveSession = (u) => {
    setUser(u);
    if (u) localStorage.setItem("gaas-session", JSON.stringify(u));
    else localStorage.removeItem("gaas-session");
  };

  const signup = async (email, password, displayName) => {
    try {
      const name = displayName || email.split("@")[0];
      const { data } = await api.post("/auth/register", { name, email, password });
      if (data?.token) {
        storeAuthToken(data.token);
        const sessionUser = {
          uid: data.user?.id || "user-" + Date.now(),
          email: data.user?.email || email,
          displayName: data.user?.name || name,
          role: data.user?.role || "user",
          plan: data.user?.plan || "basic",
          appJwt: data.token,
        };
        saveSession(sessionUser);
        return { user: sessionUser };
      }
      return { error: "Server did not return a token." };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Registration failed";
      return { error: msg };
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data?.token) {
        storeAuthToken(data.token);
        const sessionUser = {
          uid: data.user?.id || "user-" + Date.now(),
          email: data.user?.email || email,
          displayName: data.user?.name || email.split("@")[0],
          role: data.user?.role || "user",
          plan: data.user?.plan || "basic",
          planExpiresAt: data.user?.planExpiresAt || null,
          appJwt: data.token,
        };
        saveSession(sessionUser);
        return { user: sessionUser };
      }
      return { error: "Server did not return a token." };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Login failed";
      return { error: msg };
    }
  };

  const continueAsGuest = () => {
    const guestUser = {
      uid: "guest-" + Date.now(),
      email: "guest@greenhouse.local",
      displayName: "Guest",
      role: "guest",
      plan: "none"
    };
    saveSession(guestUser);
  };

  /**
   * Google Sign-In: decode JWT locally, persist session, sync user to MongoDB via Express,
   * and store app JWT for /api/admin/* calls.
   */
  const loginWithGoogle = async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) return { error: "Google sign-in did not return a credential." };
    let payload;
    try {
      payload = jwtDecode(token);
    } catch {
      return { error: "Invalid Google credential." };
    }
    if (!payload?.email) return { error: "Could not read your Google profile." };

    const email = String(payload.email);
    const displayName = payload.name || email.split("@")[0];
    const isAdmin = isAdminUser({ email });
    const sessionUser = {
      uid: payload.sub ? `google:${payload.sub}` : "google-" + Date.now(),
      email,
      displayName,
      role: isAdmin ? "admin" : "user",
      plan: isAdmin ? "pro" : "basic",
      provider: "google",
      picture: payload.picture || null,
    };
    saveSession(sessionUser);
    localStorage.setItem(GOOGLE_ID_TOKEN_KEY, token);

    try {
      const { data } = await api.post("/auth/google-login", { idToken: token });
      if (data?.token) {
        const mergedUser = {
          ...sessionUser,
          id: data?.user?.id,
          uid: data?.user?.id || sessionUser.uid,
          role: data?.user?.role || sessionUser.role,
          plan: data?.user?.plan || sessionUser.plan,
          planActivatedAt: data?.user?.planActivatedAt || null,
          planExpiresAt: data?.user?.planExpiresAt || null,
        };
        storeAuthToken(data.token);
        saveSession({ ...mergedUser, appJwt: data.token });
        return { user: { ...mergedUser, appJwt: data.token } };
      }
      return {
        user: sessionUser,
        apiError: "Server did not return a token",
      };
    } catch (err) {
      const apiError =
        err.response?.data?.error || err.message || "google-login request failed";
      console.error("[auth] google-login sync failed:", err?.response?.data || err.message);
      return { user: sessionUser, apiError };
    }
  };

  const logout = () => {
    clearAuthSessionAndTokens();
    saveSession(null);
  };

  /** Shown as "Premium" in UI — DB may store `pro` or `premium`. */
  const isPro =
    user?.plan === "pro" || user?.plan === "premium" || isAdminUser(user);
  const isAdmin = user?.role === "admin" || isAdminUser(user);
  const isGuest = user?.role === "guest";
  /** True for any signed-in user (including guest). */
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isPro,
        isAdmin,
        isGuest,
        login,
        signup,
        loginWithGoogle,
        continueAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
