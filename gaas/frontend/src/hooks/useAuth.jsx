import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import {
  api,
  clearAuthSessionAndTokens,
  ensureAppJwtFromGoogleIdToken,
  getAuthToken,
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

  // Finish auth bootstrap: exchange Google id token for app JWT; drop stale “Google” sessions with no server token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = loadSessionUserAndSyncJwt();
        if (session?.provider === "google") {
          await ensureAppJwtFromGoogleIdToken();
          if (!cancelled && !getAuthToken()) {
            clearAuthSessionAndTokens();
            saveSession(null);
            return;
          }
        }

        // Sync role/plan from backend (handles dynamic admin promotion)
        const token = getAuthToken();
        if (token && session && session.role !== "guest") {
          try {
            const { data } = await api.get("/auth/me");
            if (!cancelled && data?.user) {
              const serverRole = data.user.role || session.role;
              if (serverRole !== session.role || data.user.plan !== session.plan) {
                const updated = {
                  ...session,
                  role: serverRole,
                  plan: data.user.plan || session.plan,
                };
                saveSession(updated);
              }
            }
          } catch {
            /* /auth/me may not exist yet or token expired — silent */
          }
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
   * Google Sign-In: exchange Google ID token with Express for an app JWT, then persist session.
   * Session is only saved after the server returns a token so the UI cannot show “logged in” without API auth.
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

    localStorage.setItem(GOOGLE_ID_TOKEN_KEY, token);

    try {
      const { data } = await api.post("/auth/google-login", { idToken: token });
      if (!data?.token) {
        try {
          localStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
        } catch {
          /* ignore */
        }
        return { error: data?.error || "Server did not return a login token." };
      }

      const email = String(payload.email);
      const displayName = payload.name || email.split("@")[0];
      const mergedUser = {
        uid: data?.user?.id || (payload.sub ? `google:${payload.sub}` : `google-${Date.now()}`),
        id: data?.user?.id,
        email: data?.user?.email || email,
        displayName: data?.user?.name || displayName,
        role: data?.user?.role || "user",
        plan: data?.user?.plan || "basic",
        provider: "google",
        picture: data?.user?.picture || payload.picture || null,
        planActivatedAt: data?.user?.planActivatedAt || null,
        planExpiresAt: data?.user?.planExpiresAt || null,
      };
      storeAuthToken(data.token);
      saveSession({ ...mergedUser, appJwt: data.token });
      return { user: { ...mergedUser, appJwt: data.token } };
    } catch (err) {
      try {
        localStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      const msg =
        err.response?.data?.error || err.message || "Google sign-in could not reach the server.";
      console.error("[auth] google-login sync failed:", err?.response?.data || err.message);
      return { error: msg };
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
