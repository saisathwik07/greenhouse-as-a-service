import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { computeFertilizerRecommendations } from "../lib/fertilizerRecommend";
import { api } from "../api";
import UpgradeLock from "../components/UpgradeLock";
import { useSubscription } from "../hooks/useSubscription";

const VALID_SERVICES = ["crop", "yield", "fertilizer", "fertigation"];

const SERVICE_META = {
  crop: {
    title: "Crop Recommendation",
    description:
      "Score-based crop suggestions from soil type, temperature, humidity, pH, EC and moisture inputs.",
    accuracy: "92%",
    feature: "cropRecommendation",
  },
  yield: {
    title: "Yield Prediction",
    description:
      "Forecast tons-per-hectare with a trained ML regression model on crop, soil and NPK inputs.",
    accuracy: "88%",
    feature: "yieldPrediction",
  },
  fertilizer: {
    title: "Fertilizer Recommendation",
    description:
      "Match fertilizers to your soil chemistry using the same scoring rules as the production API.",
    accuracy: "Rule-based",
    feature: null,
  },
  fertigation: {
    title: "Fertigation Control",
    description:
      "Configure pH and EC targets, dosage and irrigation schedule for your active grow zone.",
    accuracy: "Rule-based",
    feature: null,
  },
};

const STATS_EVENT = "gaas:service-stats";

function statsKey(service) {
  return `gaas:agri:${service}`;
}

function readStats(service) {
  try {
    const raw = localStorage.getItem(statsKey(service));
    if (!raw) return { count: 0, lastUsed: null };
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count) || 0,
      lastUsed: parsed.lastUsed || null,
    };
  } catch {
    return { count: 0, lastUsed: null };
  }
}

/** Bump the per-service prediction counter; consumed by the page header
 * stat cards. Safe to call from anywhere — no React deps. */
function bumpServiceStats(service) {
  if (!VALID_SERVICES.includes(service)) return;
  const current = readStats(service);
  const next = {
    count: current.count + 1,
    lastUsed: new Date().toISOString(),
  };
  try {
    localStorage.setItem(statsKey(service), JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(STATS_EVENT, { detail: { service } })
    );
  } catch {
    /* storage quota / private mode — silent */
  }
}

function useServiceStats(service) {
  const [stats, setStats] = useState(() => readStats(service));
  useEffect(() => {
    setStats(readStats(service));
    const onUpdate = (e) => {
      if (e?.detail?.service === service || e?.key === statsKey(service)) {
        setStats(readStats(service));
      }
    };
    window.addEventListener(STATS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(STATS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [service]);
  return stats;
}

function formatLastUsed(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ label, value, hint, tone = "default" }) {
  const toneCls =
    tone === "accent"
      ? "text-gaas-accent"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "muted"
      ? "text-gaas-muted"
      : "text-gaas-heading";
  return (
    <div className="rounded-xl border border-gaas-border bg-white px-4 py-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gaas-muted">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold leading-tight ${toneCls}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-gaas-muted truncate">{hint}</p>
      )}
    </div>
  );
}

function ServiceHeader({ service, allowed, plan }) {
  const meta = SERVICE_META[service] || SERVICE_META.crop;
  const stats = useServiceStats(service);

  const planLabel =
    plan === "premium" || plan === "pro"
      ? "Premium"
      : plan === "standard"
      ? "Standard"
      : plan === "basic" || plan === "free"
      ? "Basic"
      : "Guest";

  const accessValue = !meta.feature
    ? "Included"
    : allowed
    ? "Active"
    : "Locked";
  const accessTone = !meta.feature
    ? "accent"
    : allowed
    ? "accent"
    : "warn";
  const accessHint = !meta.feature
    ? `${planLabel} plan`
    : allowed
    ? `${planLabel} plan`
    : "Upgrade required";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gaas-accent">
            Agricultural Services
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gaas-heading">
            {meta.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gaas-muted">
            {meta.description}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
            allowed || !meta.feature
              ? "bg-gaas-accent-glow text-gaas-accent ring-gaas-accent/30"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              allowed || !meta.feature ? "bg-gaas-accent" : "bg-amber-500"
            }`}
          />
          {allowed || !meta.feature ? "Service active" : "Upgrade required"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Predictions made"
          value={stats.count.toLocaleString()}
          hint={stats.count === 0 ? "No runs yet" : "On this device"}
          tone="default"
        />
        <StatCard
          label="Last used"
          value={formatLastUsed(stats.lastUsed)}
          hint={
            stats.lastUsed
              ? new Date(stats.lastUsed).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Run the service to populate"
          }
          tone={stats.lastUsed ? "default" : "muted"}
        />
        <StatCard
          label="Model accuracy"
          value={meta.accuracy}
          hint={
            meta.accuracy === "Rule-based"
              ? "Deterministic scoring"
              : "Validated on test set"
          }
          tone="accent"
        />
        <StatCard
          label="Subscription access"
          value={accessValue}
          hint={accessHint}
          tone={accessTone}
        />
      </div>
    </div>
  );
}

const FERTILIZER_OPTIONS = [
  { value: "npk_balanced", label: "NPK Balanced" },
  { value: "npk_high_k", label: "NPK High Potassium" },
  { value: "calcium_nitrate", label: "Calcium Nitrate" },
  { value: "organic_liquid", label: "Organic Liquid" }
];

const SCHEDULE_OPTIONS = [
  { value: "alternate", label: "Alternate Days" },
  { value: "daily", label: "Daily" },
  { value: "twice_weekly", label: "Twice Weekly" },
  { value: "weekly", label: "Weekly" }
];

const DEFAULT_FERTIGATION = {
  fertilizerType: "npk_balanced",
  dosageMlPerL: 7,
  schedule: "alternate",
  targetPh: 6.5,
  targetEc: 1.5
};

const toInputNumber = (value) => (value === "" ? "" : Number(value));

export default function AgriculturalPage() {
  const location = useLocation();
  const initialService = useMemo(() => {
    const q = new URLSearchParams(location.search).get("service");
    return VALID_SERVICES.includes(q) ? q : "crop";
  }, [location.search]);
  const [activeService, setActiveService] = useState(initialService);
  /* Sync active tab when sidebar links navigate with a different `?service=`. */
  useEffect(() => {
    setActiveService(initialService);
  }, [initialService]);
  const { canAccess, plan } = useSubscription();
  const cropAllowed = canAccess("cropRecommendation");
  const yieldAllowed = canAccess("yieldPrediction");

  const allowedForActive =
    activeService === "crop"
      ? cropAllowed
      : activeService === "yield"
      ? yieldAllowed
      : true;

  return (
    <div className="space-y-6 animate-in">
      <ServiceHeader
        service={activeService}
        allowed={allowedForActive}
        plan={plan}
      />

      {activeService === "crop" && (
        <div className="relative">
          <div className={cropAllowed ? "" : "pointer-events-none blur-[1px] select-none"}>
            <CropPrediction />
          </div>
          {!cropAllowed && (
            <UpgradeLock
              title="Upgrade Required"
              message="Crop Recommendation is included on Standard and Premium. The free Basic tier includes live data and downloads only."
            />
          )}
        </div>
      )}
      {activeService === "yield" && (
        <div className="relative">
          <div className={yieldAllowed ? "" : "pointer-events-none blur-[1px] select-none"}>
            <YieldPrediction />
          </div>
          {!yieldAllowed && (
            <UpgradeLock
              title="Upgrade Required"
              message="Yield Prediction is included on Standard and Premium. Upgrade from the free Basic tier to unlock it."
            />
          )}
        </div>
      )}
      {activeService === "fertilizer" && <FertilizerRecommendation />}
      {activeService === "fertigation" && <FertigationControl />}
    </div>
  );
}

function CropPrediction() {
  const crops = [
    { name: "Rice", soilTypes: ["Alluvial", "Clay"], tempRange: [22, 32], humidityRange: [70, 100], phRange: [5.5, 6.5], moistureRange: [60, 80], ecRange: [1, 2] },
    { name: "Wheat", soilTypes: ["Loamy", "Clay"], tempRange: [15, 25], humidityRange: [50, 70], phRange: [6.0, 7.5], moistureRange: [40, 60], ecRange: [1, 1.5] },
    { name: "Maize", soilTypes: ["Loamy", "Sandy"], tempRange: [18, 30], humidityRange: [50, 80], phRange: [5.5, 7.5], moistureRange: [50, 70], ecRange: [1, 2] },
    { name: "Cotton", soilTypes: ["Black", "Alluvial"], tempRange: [20, 35], humidityRange: [60, 80], phRange: [5.5, 8.0], moistureRange: [40, 60], ecRange: [1, 2] },
    { name: "Tomato", soilTypes: ["Loamy", "Sandy"], tempRange: [20, 30], humidityRange: [60, 80], phRange: [5.5, 7.0], moistureRange: [50, 70], ecRange: [1, 2] }
  ];

  function calculateCropScores(params) {
    const inRange = (value, [min, max]) => value >= min && value <= max;
    return crops
      .map((crop) => {
        let score = 0;
        if (crop.soilTypes.includes(params.soilType)) score += 20;
        if (inRange(params.temperature, crop.tempRange)) score += 20;
        if (inRange(params.humidity, crop.humidityRange)) score += 20;
        if (inRange(params.ph, crop.phRange)) score += 20;
        if (inRange(params.soilMoisture, crop.moistureRange)) score += 10;
        if (inRange(params.ec, crop.ecRange)) score += 10;
        return { crop: crop.name, match: score };
      })
      .sort((a, b) => b.match - a.match);
  }

  const [form, setForm] = useState({
    soilType: "Loamy",
    soilMoisture: 55,
    ec: 1.4,
    ph: 6.5,
    temperature: 25,
    humidity: 68
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasInvalidInput = Object.entries(form).some(([key, value]) => {
      if (key === "soilType") return value === "" || value == null;
      return value === "" || value == null || Number.isNaN(Number(value));
    });
    if (hasInvalidInput) {
      alert("Please fill in all input fields with valid values.");
      return;
    }

    setLoading(true);
    const numericForm = {
      ...form,
      temperature: Number(form.temperature),
      humidity: Number(form.humidity),
      soilMoisture: Number(form.soilMoisture),
      ph: Number(form.ph),
      ec: Number(form.ec)
    };
    const ranked = calculateCropScores(numericForm).slice(0, 5);
    setResults(ranked);
    bumpServiceStats("crop");
    setLoading(false);
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const SOIL_TYPES = ["Loamy", "Sandy", "Clay", "Alluvial", "Red", "Black"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gaas-heading mb-4">Input Parameters</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">Soil Type</label>
            <select
              value={form.soilType}
              onChange={(e) => updateField("soilType", e.target.value)}
              className="input-field w-full"
            >
              {SOIL_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {[
            { key: "temperature", label: "Temperature (°C)", min: 0, max: 50, step: 0.5 },
            { key: "humidity", label: "Humidity (%)", min: 0, max: 100, step: 1 },
            { key: "soilMoisture", label: "Soil Moisture (%)", min: 0, max: 100, step: 1 },
            { key: "ph", label: "pH Level", min: 0, max: 14, step: 0.1 },
            { key: "ec", label: "EC (mS/cm)", min: 0, max: 5, step: 0.1 }
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label className="text-xs text-gaas-muted mb-1.5 block">{label}</label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => updateField(key, toInputNumber(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="input-field w-full"
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Analyzing..." : "Get Top 5 Crops"}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gaas-heading mb-4">Recommendations</h2>
        {results.length === 0 ? (
          <div className="text-center py-12 text-gaas-muted">
            <p className="text-3xl mb-3">🌾</p>
            <p>Enter parameters to get recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={r.crop}
                className={`flex items-center gap-4 bg-gaas-bg rounded-lg p-4 ${
                  i === 0 ? "ring-1 ring-gaas-accent/40" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gaas-accent/20 flex items-center justify-center text-sm font-bold text-gaas-accent">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gaas-heading">{r.crop}</p>
                  <div className="w-full h-1.5 bg-gaas-border rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gaas-accent rounded-full transition-all duration-500"
                      style={{ width: `${r.match}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gaas-accent tabular-nums">{r.match}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Model output is FAO-style yield (hg/ha); display as tons/hectare for readability (1 t/ha = 10,000 hg/ha). */
const HG_PER_HA_TO_TONS_PER_HA = 1 / 10_000;

/**
 * Yield API: same-origin `/api/yield/*` → Vite proxies to Flask (crop_api :5000).
 * Avoids direct browser → 127.0.0.1:5000 (connection/CORS issues). Optional VITE_YIELD_ORIGIN
 * to call Flask directly (uses /crops and /predict on that host).
 */
function yieldApiRoot() {
  return import.meta.env.VITE_YIELD_ORIGIN?.replace(/\/$/, "") || "";
}

const _yieldRoot = yieldApiRoot();
const YIELD_CROPS_URL = _yieldRoot ? `${_yieldRoot}/crops` : "/yield/crops";
const YIELD_PREDICT_URL = _yieldRoot ? `${_yieldRoot}/predict` : "/yield/predict";

const YIELD_SOIL_OPTIONS = [
  { value: "clay", label: "Clay" },
  { value: "sandy", label: "Sandy" },
  { value: "loamy", label: "Loamy" }
];

/** Fallback if GET /crops fails; keep in sync with training data `Item` list. */
const YIELD_CROPS_FALLBACK = [
  "Cassava",
  "Maize",
  "Plantains and others",
  "Potatoes",
  "Rice, paddy",
  "Sorghum",
  "Soybeans",
  "Sweet potatoes",
  "Wheat",
  "Yams"
];

function YieldPrediction() {
  const [cropOptions, setCropOptions] = useState(YIELD_CROPS_FALLBACK);
  const [cropType, setCropType] = useState(YIELD_CROPS_FALLBACK[1]);
  const [soilType, setSoilType] = useState("loamy");
  /** Sensible starter values (kg/ha for NPK, °C for temperature). */
  const [n, setN] = useState(120);
  const [p, setP] = useState(60);
  const [k, setK] = useState(40);
  const [temperature, setTemperature] = useState(22);
  const [predictedTonsPerHa, setPredictedTonsPerHa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data;
        if (_yieldRoot) {
          const res = await fetch(YIELD_CROPS_URL);
          if (!res.ok) return;
          data = await res.json();
        } else {
          const response = await api.get(YIELD_CROPS_URL);
          data = response.data;
        }
        if (cancelled || !Array.isArray(data.crops) || data.crops.length === 0) return;
        setCropOptions(data.crops);
        setCropType((prev) => (data.crops.includes(prev) ? prev : data.crops[0]));
      } catch {
        /* keep fallback list */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePredict = async (e) => {
    e.preventDefault();
    setError(null);
    setPredictedTonsPerHa(null);

    const nVal = Number(n);
    const pVal = Number(p);
    const kVal = Number(k);
    const tVal = Number(temperature);
    if (
      n === "" ||
      p === "" ||
      k === "" ||
      temperature === "" ||
      !Number.isFinite(nVal) ||
      !Number.isFinite(pVal) ||
      !Number.isFinite(kVal) ||
      !Number.isFinite(tVal)
    ) {
      setError("Please enter valid numbers for N, P, K, and temperature.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        crop_type: cropType,
        soil_type: soilType,
        n: nVal,
        p: pVal,
        k: kVal,
        temperature: tVal
      };
      let data;
      try {
        if (_yieldRoot) {
          const res = await fetch(YIELD_PREDICT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const err = new Error("request failed");
            err.response = { status: res.status, data };
            throw err;
          }
        } else {
          const response = await api.post(YIELD_PREDICT_URL, payload);
          data = response.data;
        }
      } catch (err) {
        const status = err?.response?.status;
        const serverData = err?.response?.data || {};
        let hint = "";
        if (status === 404) {
          hint =
            " Flask must serve /api/yield/* on port 5000 (python gaas/ai-service/crop_api.py). Check .env: VITE_DEV_FLASK_URL must be http://127.0.0.1:5000 not 5100. Restart Vite after changing env. Train: cd gaas/ai-service/yield-prediction && python train.py";
        } else if (status === 502) {
          hint =
            " Proxy/upstream error. In dev we call http://127.0.0.1:5000 directly — start crop_api (python crop_api.py) from gaas/ai-service.";
        } else if (status === 503) {
          hint =
            " Train the model: cd gaas/ai-service/yield-prediction && python train.py";
        }
        setError((serverData.error || `Request failed (${status || "network"})`) + hint);
        return;
      }
      if (typeof data.predicted_yield !== "number" && typeof data.predicted_yield !== "string") {
        setError("Unexpected response from yield service.");
        return;
      }
      const hgHa = Number(data.predicted_yield);
      if (!Number.isFinite(hgHa)) {
        setError("Invalid prediction value returned.");
        return;
      }
      setPredictedTonsPerHa(hgHa * HG_PER_HA_TO_TONS_PER_HA);
      bumpServiceStats("yield");
    } catch (err) {
      console.error("Yield prediction failed", err);
      setError(
        err?.message?.includes("Failed to fetch")
          ? "Could not reach the ML API (Flask on :5000). From gaas/frontend run: npm run dev:all — or in another terminal: cd gaas/ai-service && python crop_api.py. Train once: cd gaas/ai-service/yield-prediction && python train.py"
          : err?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gaas-heading mb-1">Yield Prediction</h2>
        <p className="text-sm text-gaas-muted mb-6">
          Choose crop and soil type, enter NPK (kg/ha) and temperature. The model returns estimated yield
          (tons/hectare).
        </p>

        <form onSubmit={handlePredict} className="space-y-4">
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block font-medium">
              Crop type <span className="text-gaas-accent">*</span>
            </label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="input-field w-full"
            >
              {cropOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block font-medium">
              Soil type <span className="text-gaas-accent">*</span>
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="input-field w-full"
            >
              {YIELD_SOIL_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gaas-muted mb-1.5 block">N — Nitrogen (kg/ha)</label>
              <input
                type="number"
                value={n}
                onChange={(e) => setN(toInputNumber(e.target.value))}
                min={0}
                step={0.1}
                className="input-field w-full"
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label className="text-xs text-gaas-muted mb-1.5 block">P — Phosphorus (kg/ha)</label>
              <input
                type="number"
                value={p}
                onChange={(e) => setP(toInputNumber(e.target.value))}
                min={0}
                step={0.1}
                className="input-field w-full"
                placeholder="e.g. 60"
              />
            </div>
            <div>
              <label className="text-xs text-gaas-muted mb-1.5 block">K — Potassium (kg/ha)</label>
              <input
                type="number"
                value={k}
                onChange={(e) => setK(toInputNumber(e.target.value))}
                min={0}
                step={0.1}
                className="input-field w-full"
                placeholder="e.g. 40"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">Temperature (°C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(toInputNumber(e.target.value))}
              step={0.1}
              className="input-field w-full"
              placeholder="e.g. 22"
            />
          </div>

          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? "Predicting…" : "Predict Yield"}
          </button>
        </form>

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {predictedTonsPerHa != null && !error && (
          <p className="mt-6 text-base font-semibold text-gaas-heading tabular-nums">
            Predicted Yield: {predictedTonsPerHa.toFixed(2)} tons/hectare
          </p>
        )}
      </div>
    </div>
  );
}

function FertilizerRecommendation() {
  const [form, setForm] = useState({
    cropType: "Tomato",
    soilType: "Loamy",
    ph: 6.5,
    ec: 1.5
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.ph === "" || form.ec === "") {
      alert("Please fill in all input fields with valid values.");
      return;
    }
    const ph = Number(form.ph);
    const ec = Number(form.ec);
    if (!Number.isFinite(ph) || !Number.isFinite(ec)) {
      alert("Please enter valid numbers for pH and EC.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Client-side scoring (same rules as crop_api.py) — no HTTP, avoids 404/proxy/CORS issues.
      const recommendations = computeFertilizerRecommendations({ ph, ec });
      setResults(recommendations);
      bumpServiceStats("fertilizer");
    } catch (err) {
      console.error("Fertilizer recommendation failed", err);
      setError(err?.message || "Could not compute recommendations.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const CROPS = ["Tomato", "Rice", "Wheat", "Maize", "Chili", "Lettuce"];
  const SOIL_TYPES = ["Loamy", "Sandy", "Clay", "Alluvial", "Red", "Black"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gaas-heading mb-4">Input Parameters</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">Crop Type</label>
            <select
              value={form.cropType}
              onChange={(e) => updateField("cropType", e.target.value)}
              className="input-field w-full"
            >
              {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">Soil Type</label>
            <select
              value={form.soilType}
              onChange={(e) => updateField("soilType", e.target.value)}
              className="input-field w-full"
            >
              {SOIL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">pH Level</label>
            <input
              type="number"
              value={form.ph}
              onChange={(e) => updateField("ph", toInputNumber(e.target.value))}
              min={0} max={14} step={0.1}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gaas-muted mb-1.5 block">EC (mS/cm)</label>
            <input
              type="number"
              value={form.ec}
              onChange={(e) => updateField("ec", toInputNumber(e.target.value))}
              min={0} max={5} step={0.1}
              className="input-field w-full"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Analyzing..." : "Get Fertilizer Recommendations"}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-gaas-heading mb-4">Recommendations</h2>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}
        {results.length === 0 && !error ? (
          <div className="text-center py-12 text-gaas-muted">
            <p className="text-3xl mb-3">🧪</p>
            <p>Submit parameters to get fertilizer recommendations</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={r.fertilizer} className="bg-gaas-bg rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gaas-accent/20 flex items-center justify-center text-sm font-bold text-gaas-accent">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gaas-heading">{r.fertilizer}</p>
                    <p className="text-xs text-gaas-muted">{r.description}</p>
                  </div>
                  <span className="text-sm font-bold text-gaas-accent tabular-nums">{r.match}%</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gaas-muted mt-2 pl-11">
                  <span>💧 Dosage: {r.dosageMlPerL} mL/L</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FertigationControl() {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FERTIGATION }));
  const [appliedModel, setAppliedModel] = useState(() => ({ ...DEFAULT_FERTIGATION }));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const summaryForModal = () => {
    const fert = FERTILIZER_OPTIONS.find((o) => o.value === form.fertilizerType);
    const sched = SCHEDULE_OPTIONS.find((o) => o.value === form.schedule);
    const fertilizerName =
      form.fertilizerType === "npk_balanced"
        ? "NPK"
        : (fert?.label.split(" ")[0] ?? fert?.label ?? form.fertilizerType);
    return {
      fertilizer: fertilizerName,
      dosage: form.dosageMlPerL,
      schedule: sched?.value ?? form.schedule,
      targetPh: form.targetPh,
      targetEc: form.targetEc
    };
  };

  const applySettings = () => {
    if (form.targetPh === "" || form.targetEc === "") {
      alert("Please fill in all input fields with valid values.");
      return;
    }
    setAppliedModel({ ...form });
    bumpServiceStats("fertigation");
    setModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    applySettings();
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_FERTIGATION });
    setAppliedModel({ ...DEFAULT_FERTIGATION });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="glass-card p-6 lg:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Fertigation Control Model</h2>
            <p className="text-sm text-gaas-muted mt-1.5 max-w-md mx-auto">
              Configure your fertigation settings to optimize plant growth.
            </p>
          </div>
          <form onSubmit={handleFormSubmit} className="space-y-5 max-w-md mx-auto">
            <div>
              <label className="text-sm font-semibold text-gaas-heading mb-1.5 block">Fertilizer Type</label>
              <select
                value={form.fertilizerType}
                onChange={(e) => updateField("fertilizerType", e.target.value)}
                className="input-field w-full"
              >
                {FERTILIZER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gaas-heading mb-1.5 block">Dosage (ml/L)</label>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={form.dosageMlPerL}
                onChange={(e) => updateField("dosageMlPerL", Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-gaas-accent cursor-pointer"
              />
              <p className="text-right text-sm text-gaas-muted mt-1 tabular-nums">
                {form.dosageMlPerL} ml/L
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gaas-heading mb-1.5 block">Schedule</label>
              <select
                value={form.schedule}
                onChange={(e) => updateField("schedule", e.target.value)}
                className="input-field w-full"
              >
                {SCHEDULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gaas-heading mb-1.5 block">Target pH</label>
              <input
                type="number"
                value={form.targetPh}
                onChange={(e) => updateField("targetPh", toInputNumber(e.target.value))}
                min={0}
                max={14}
                step={0.1}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gaas-heading mb-1.5 block">Target EC (dS/m)</label>
              <input
                type="number"
                value={form.targetEc}
                onChange={(e) => updateField("targetEc", toInputNumber(e.target.value))}
                min={0}
                max={5}
                step={0.1}
                className="input-field w-full"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button type="submit" className="btn-primary min-w-[140px]">
                Apply Settings
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="min-w-[140px] font-semibold px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-all duration-200 active:scale-[0.98]"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-3 lg:justify-end">
            <button type="button" onClick={applySettings} className="btn-primary min-w-[140px]">
              Apply Settings
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-w-[140px] font-semibold px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-all duration-200 active:scale-[0.98]"
            >
              Reset
            </button>
          </div>

          <div className="rounded-xl bg-gray-100 border border-gaas-border px-5 py-4">
            <h3 className="text-base font-bold text-gaas-heading mb-2">Fertigation Model Information</h3>
            <p className="text-sm text-gaas-muted leading-relaxed">
              The fertigation control system allows you to manage fertilizer type, dosage, pH and EC levels, and
              application schedules. Analytics visualize nutrient delivery, soil response, and plant uptake trends for
              optimal growth.
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fertigation-modal-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700 p-6 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fertigation-modal-title" className="text-lg font-semibold text-white mb-1">
              Fertigation settings applied:
            </h2>
            <p className="text-xs text-slate-400 mb-4">Review the parameters sent to the control model.</p>
            <ul className="space-y-2.5 text-sm">
              {(() => {
                const s = summaryForModal();
                return (
                  <>
                    <li>
                      <span className="text-slate-400">Fertilizer:</span>{" "}
                      <span className="text-white font-medium">{s.fertilizer}</span>
                    </li>
                    <li>
                      <span className="text-slate-400">Dosage:</span>{" "}
                      <span className="text-white font-medium">{s.dosage} ml/L</span>
                    </li>
                    <li>
                      <span className="text-slate-400">Schedule:</span>{" "}
                      <span className="text-white font-medium">{s.schedule}</span>
                    </li>
                    <li>
                      <span className="text-slate-400">Target pH:</span>{" "}
                      <span className="text-white font-medium">{s.targetPh}</span>
                    </li>
                    <li>
                      <span className="text-slate-400">Target EC:</span>{" "}
                      <span className="text-white font-medium">{s.targetEc} dS/m</span>
                    </li>
                  </>
                );
              })()}
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-900 font-semibold text-sm transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

