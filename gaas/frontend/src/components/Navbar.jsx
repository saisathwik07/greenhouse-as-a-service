import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import UserProfileMenu from "./UserProfileMenu";
import NotificationBell from "./NotificationBell";

/** OAuth Web Client ID — same origin must be allowed in Google Cloud Console. */
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * Top navigation: clean white bar with soft shadow.
 * - No session: logo (left) + Login / Sign up + Google (right).
 * - Logged in: logo + optional badges + profile avatar + name + dropdown (logout).
 */
export default function Navbar({ authFormMode = "login", onAuthFormModeChange }) {
  const { user, isPro, isAdmin, isGuest, loginWithGoogle, logout } = useAuth();
  const homePath = user && !isGuest ? "/home" : "/";
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    const result = await loginWithGoogle(credentialResponse);
    if (result?.user && !result?.error) {
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 shadow-sm shadow-slate-200/50 sm:px-6">
      {/* Brand — left */}
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="m-0 truncate text-lg font-bold tracking-tight text-emerald-800 sm:text-xl">
          <button
            type="button"
            onClick={() => navigate(user ? homePath : "/")}
            className="rounded-md bg-transparent text-left font-bold text-inherit transition-colors hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            Greenhouse as a Service
          </button>
        </h1>
        {user && isPro && (
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60 md:inline">
            Premium
          </span>
        )}
        {user && isAdmin && (
          <span className="hidden rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80 sm:inline">
            Admin
          </span>
        )}
      </div>

      {/* Actions — right */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {!user ? (
          <>
            {/* Email auth: switch form mode on LoginPage */}
            <button
              type="button"
              onClick={() => onAuthFormModeChange?.("login")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                authFormMode === "login"
                  ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onAuthFormModeChange?.("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                authFormMode === "signup"
                  ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/80"
              }`}
            >
              Sign up
            </button>

            {/* Google — replaces “login” slot once user signs in elsewhere; here it’s the OAuth entry */}
            {googleClientId ? (
              <div className="ml-1 flex items-center [&>div]:leading-none">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {}}
                  useOneTap={false}
                  theme="outline"
                  size="medium"
                  text="continue_with"
                  shape="pill"
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            {!isGuest && <NotificationBell />}
            <UserProfileMenu
              displayName={user.displayName}
              email={user.email}
              pictureUrl={user.picture}
              isGuest={isGuest}
              isAdmin={isAdmin}
              onLogout={logout}
            />
          </>
        )}
      </div>
    </header>
  );
}
