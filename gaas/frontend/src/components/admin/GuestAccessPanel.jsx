import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lock,
  LockOpen,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../../api";

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

const FEATURE_DESCRIPTIONS = {
  liveData: "Real-time sensor dashboard and latest greenhouse readings.",
  downloadData: "CSV, JSON, and dataset exports for guest sessions.",
  cropRecommendation: "Crop scoring from soil, moisture, pH, EC, and weather inputs.",
  yieldPrediction: "ML yield forecast from crop, soil, NPK, and temperature inputs.",
  pestDisease: "Pest prediction and image-based disease detection workflows.",
  fertigation: "NPK, pH, EC, dosage, and fertigation schedule controls.",
  irrigation: "Smart watering and greenhouse irrigation tools.",
  mqtt: "Realtime IoT dashboard, MQTT stream, and device monitoring.",
  aiAnalytics: "Predictive analytics, anomaly detection, and clustering dashboards.",
  prioritySupport: "Priority support capabilities for guest users.",
  aiCropPlus: "Enhanced crop recommendation add-on access.",
  unlimitedDownloads: "Higher-volume export behavior for guest users.",
};

function featureLabel(featureName) {
  return FEATURE_LABELS[featureName] || featureName;
}

function featureDescription(featureName) {
  return (
    FEATURE_DESCRIPTIONS[featureName] ||
    "Custom future module controlled by the guest access registry."
  );
}

function formatUpdatedAt(value) {
  if (!value) return "Not updated yet";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not updated yet";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeFeatureRows(data) {
  const rows = Array.isArray(data?.features) ? data.features : [];
  const known = Array.isArray(data?.knownFeatures) ? data.knownFeatures : [];
  const byName = new Map(rows.map((row) => [row.featureName, row]));

  known.forEach((featureName) => {
    if (!byName.has(featureName)) {
      byName.set(featureName, {
        featureName,
        isLocked: true,
        effectiveLocked: data?.guestGlobalUnlock ? false : true,
        guestGlobalUnlock: !!data?.guestGlobalUnlock,
        updatedAt: null,
        updatedBy: null,
      });
    }
  });

  return Array.from(byName.values());
}

function ToggleSwitch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
        checked
          ? "border-gaas-accent bg-gaas-accent"
          : "border-gray-300 bg-gray-200"
      } ${disabled ? "cursor-wait opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function GuestAccessPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingFeature, setPendingFeature] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const featureRows = useMemo(() => normalizeFeatureRows(settings), [settings]);
  const unlockedCount = featureRows.filter((row) => !row.effectiveLocked).length;
  const lockedCount = featureRows.length - unlockedCount;
  const guestGlobalUnlock = !!settings?.guestGlobalUnlock;
  const busy = saving || Boolean(pendingFeature);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.get("/admin/guest-access");
      setSettings(data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to load guest access settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateGlobalUnlock = async (guestGlobalUnlockValue) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put("/admin/guest-access/global", {
        guestGlobalUnlock: guestGlobalUnlockValue,
      });
      setSettings(data);
      setNotice(
        guestGlobalUnlockValue
          ? "Guest access is globally unlocked."
          : "Global unlock is disabled."
      );
      return data;
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to update global guest access"
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateFeatureLock = async (featureName, isLocked) => {
    setPendingFeature(featureName);
    setError("");
    setNotice("");
    try {
      await api.put(
        `/admin/guest-access/feature/${encodeURIComponent(featureName)}`,
        { isLocked }
      );
      await loadSettings();
      setNotice(
        `${featureLabel(featureName)} is now ${
          isLocked ? "locked" : "unlocked"
        } for guests.`
      );
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          `Failed to update ${featureLabel(featureName)}`
      );
    } finally {
      setPendingFeature("");
    }
  };

  const unlockAll = async () => {
    await updateGlobalUnlock(true);
  };

  const lockAll = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.put("/admin/guest-access/global", {
        guestGlobalUnlock: false,
      });
      await Promise.all(
        featureRows.map((row) =>
          api.put(
            `/admin/guest-access/feature/${encodeURIComponent(row.featureName)}`,
            { isLocked: true }
          )
        )
      );
      await loadSettings();
      setNotice("All guest features are locked.");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to lock all guest features"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 text-sm text-gaas-muted">
        Loading guest access controls...
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-base font-bold text-gaas-heading">
          Guest Access Management
        </h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={loadSettings}
          className="btn-secondary mt-4 inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">
              Guest Access
            </p>
            <h2 className="mt-1 text-xl font-bold text-gaas-heading">
              Admin-controlled guest permissions
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gaas-muted">
              Current module availability for users who enter as guests.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSettings}
            disabled={busy}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {(notice || error) && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gaas-muted">
                Global mode
              </p>
              <p className="mt-1 text-2xl font-extrabold text-gaas-heading">
                {guestGlobalUnlock ? "Unlocked" : "Per feature"}
              </p>
            </div>
            <ShieldCheck
              className={`h-9 w-9 ${
                guestGlobalUnlock ? "text-gaas-accent" : "text-gray-300"
              }`}
            />
          </div>
          <p className="mt-2 text-xs text-gaas-muted">
            {guestGlobalUnlock
              ? "Every feature is available to guests until global unlock is turned off."
              : "Guests follow the individual feature toggles below."}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Unlocked features
          </p>
          <p className="mt-1 text-2xl font-extrabold text-gaas-accent">
            {unlockedCount}
          </p>
          <p className="mt-2 text-xs text-gaas-muted">
            Effective guest-access count from current settings.
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Locked features
          </p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {lockedCount}
          </p>
          <p className="mt-2 text-xs text-gaas-muted">
            Features that remain blocked for guest sessions.
          </p>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-gaas-accent" />
            <div>
              <h3 className="text-base font-bold text-gaas-heading">
                Guest access controls
              </h3>
              <p className="text-xs text-gaas-muted">
                Bulk actions and per-feature controls share the same settings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={unlockAll}
              disabled={busy}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <LockOpen className="h-4 w-4" />
              Unlock all
            </button>
            <button
              type="button"
              onClick={lockAll}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              Lock all
            </button>
          </div>
        </div>

        <div className="mt-4 divide-y divide-gaas-border overflow-hidden rounded-lg border border-gaas-border bg-white">
          {featureRows.map((feature) => {
            const effectiveUnlocked = !feature.effectiveLocked;
            const directUnlocked = !feature.isLocked;
            const disabled = saving || pendingFeature === feature.featureName;
            return (
              <div
                key={feature.featureName}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gaas-heading">
                      {featureLabel(feature.featureName)}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        effectiveUnlocked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {effectiveUnlocked ? "Guest unlocked" : "Guest locked"}
                    </span>
                    {guestGlobalUnlock && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                        Global override
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gaas-muted">
                    {featureDescription(feature.featureName)}
                  </p>
                  <p className="mt-1 text-[11px] text-gaas-muted">
                    Key:{" "}
                    <span className="font-mono text-gaas-heading">
                      {feature.featureName}
                    </span>{" "}
                    · Updated {formatUpdatedAt(feature.updatedAt)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs font-semibold text-gaas-muted">
                    {directUnlocked ? "Unlocked" : "Locked"}
                  </span>
                  <ToggleSwitch
                    checked={directUnlocked}
                    disabled={disabled}
                    label={`Toggle ${featureLabel(feature.featureName)}`}
                    onChange={(nextUnlocked) =>
                      updateFeatureLock(feature.featureName, !nextUnlocked)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {featureRows.length === 0 && (
          <p className="py-8 text-center text-sm text-gaas-muted">
            No guest-controlled features found.
          </p>
        )}
      </div>
    </div>
  );
}
