/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Lock, LogIn, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "./useAuth";

const GuestAccessContext = createContext(null);

const FEATURE_LABELS = {
  liveData: "Live Data",
  downloadData: "Data Downloads",
  cropRecommendation: "Crop Recommendation",
  yieldPrediction: "Yield Prediction",
  pestDisease: "Pest & Disease",
  fertigation: "Fertigation",
  irrigation: "Irrigation",
  mqtt: "MQTT / IoT Dashboard",
  aiAnalytics: "AI Analytics",
  prioritySupport: "Priority Support",
  aiCropPlus: "AI Crop Recommendation Plus",
  unlimitedDownloads: "Unlimited Downloads",
};

function firstFeature(featureName) {
  if (Array.isArray(featureName)) return featureName[0] || "";
  return featureName || "";
}

/** Shown when a guest hits a sidebar or gated control that stays locked under current settings. */
export const GUEST_FEATURE_LOCKED_TITLE = "This feature is locked for guest users";

export function getGuestFeatureLabel(featureName) {
  const key = firstFeature(featureName);
  return FEATURE_LABELS[key] || key || "this feature";
}

function buildAccessMap(settings) {
  const map = new Map();
  const globalUnlock = !!settings?.guestGlobalUnlock;
  const features = Array.isArray(settings?.features) ? settings.features : [];

  features.forEach((feature) => {
    map.set(feature.featureName, {
      ...feature,
      effectiveLocked: globalUnlock ? false : !!feature.effectiveLocked,
    });
  });

  return map;
}

function GuestLockedModal({ modal, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  if (!modal) return null;

  const title = modal.title || GUEST_FEATURE_LOCKED_TITLE;
  const message =
    modal.message ||
    "Create an account or log in if you want a full account with additional options.";

  const goToAuth = (path) => {
    onClose();
    logout();
    navigate(path, { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-lock-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gaas-border bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="guest-lock-title" className="text-lg font-bold text-gaas-heading">
                {title}
              </h2>
              <p className="mt-0.5 text-sm text-gaas-muted">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => goToAuth("/signup")}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Sign up
          </button>
          <button
            type="button"
            onClick={() => goToAuth("/login")}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
        </div>

        <button
          type="button"
          onClick={() => goToAuth("/signup")}
          className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Upgrade after creating an account
        </button>
      </div>
    </div>
  );
}

export function GuestAccessProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const refreshGuestAccess = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      /* Same registry as GET /admin/guest-access; that route is admin-JWT-only. Guests read via /api/guest-access. */
      const { data } = await api.get("/guest-access");
      setSettings(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Guest access settings unavailable");
      setSettings({ guestGlobalUnlock: false, features: [], knownFeatures: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGuestAccess();
  }, [refreshGuestAccess]);

  const accessMap = useMemo(() => buildAccessMap(settings), [settings]);
  const guestGlobalUnlock = !!settings?.guestGlobalUnlock;

  const isGuestFeatureUnlocked = useCallback(
    (featureName) => {
      if (!featureName) return false;
      if (guestGlobalUnlock) return true;
      const features = Array.isArray(featureName) ? featureName : [featureName];
      return features.some((feature) => {
        const row = accessMap.get(feature);
        return row ? !row.effectiveLocked : false;
      });
    },
    [accessMap, guestGlobalUnlock]
  );

  const openGuestAccessModal = useCallback((payload = {}) => {
    setModal({
      featureName: payload.featureName || "",
      title: payload.title || GUEST_FEATURE_LOCKED_TITLE,
      message:
        payload.message ||
        `${getGuestFeatureLabel(payload.featureName)} is unavailable for guest sessions with the current settings.`,
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      guestGlobalUnlock,
      isGuestFeatureUnlocked,
      openGuestAccessModal,
      refreshGuestAccess,
    }),
    [
      settings,
      loading,
      error,
      guestGlobalUnlock,
      isGuestFeatureUnlocked,
      openGuestAccessModal,
      refreshGuestAccess,
    ]
  );

  return (
    <GuestAccessContext.Provider value={value}>
      {children}
      <GuestLockedModal modal={modal} onClose={() => setModal(null)} />
    </GuestAccessContext.Provider>
  );
}

export function useGuestAccess() {
  const ctx = useContext(GuestAccessContext);
  if (!ctx) throw new Error("useGuestAccess must be used inside GuestAccessProvider");
  return ctx;
}
