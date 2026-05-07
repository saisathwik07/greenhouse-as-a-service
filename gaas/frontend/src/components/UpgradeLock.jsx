import { useNavigate } from "react-router-dom";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { GUEST_FEATURE_LOCKED_TITLE } from "../hooks/useGuestAccess";

export default function UpgradeLock({
  title = "Upgrade Required",
  message = "This feature is available on higher plans.",
}) {
  const navigate = useNavigate();
  const { isGuest, logout } = useAuth();

  const goToAuth = (path) => {
    logout();
    navigate(path, { replace: true });
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-xl border border-gaas-border bg-white p-5 text-center shadow-sm">
        <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Lock className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-gaas-heading">
          {isGuest ? GUEST_FEATURE_LOCKED_TITLE : title}
        </h3>
        <p className="mt-1 text-sm text-gaas-muted">{message}</p>

        {isGuest ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => goToAuth("/signup")}
              className="btn-primary inline-flex w-full items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Sign up
            </button>
            <button
              type="button"
              onClick={() => goToAuth("/login")}
              className="btn-secondary inline-flex w-full items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </button>
            <button
              type="button"
              onClick={() => goToAuth("/signup")}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Upgrade after creating an account
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="btn-primary mt-4 w-full"
          >
            View Plans
          </button>
        )}
      </div>
    </div>
  );
}
