import { useEffect, useState } from "react";
import SensorCard from "../components/SensorCard";
import HealthIndicator from "../components/HealthIndicator";
import AlertBanner from "../components/AlertBanner";
import RowGrid from "../components/RowGrid";
import PlantDetailModal from "../components/PlantDetailModal";
import { useSensors, useRows, useBags } from "../hooks/useSensors";
import { useSubscription } from "../hooks/useSubscription";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, ensureAppJwtFromGoogleIdToken, getAuthToken, getMissingAppJwtHelpText } from "../api";
import { formatPlanDisplayName, isPaidPremiumPlan } from "../lib/planDisplay";

/* ── Service Quick-Access Cards ────────────────────────────────────────────── */

const SERVICES = [
  {
    id: "data",
    label: "Data as a Service",
    desc: "Live sensor data & CSV exports",
    icon: "📊",
    to: "/data",
    gradient: "from-blue-500 to-cyan-400",
    bgGlow: "bg-blue-50",
  },
  {
    id: "crop",
    label: "Crop Recommendation",
    desc: "AI-powered crop suggestions",
    icon: "🌾",
    to: "/agricultural?service=crop",
    gradient: "from-emerald-500 to-green-400",
    bgGlow: "bg-emerald-50",
  },
  {
    id: "yield",
    label: "Yield Prediction",
    desc: "Forecast harvest outcomes",
    icon: "📈",
    to: "/agricultural?service=yield",
    gradient: "from-amber-500 to-yellow-400",
    bgGlow: "bg-amber-50",
  },
  {
    id: "pest",
    label: "Pest Detection",
    desc: "Smart pest & disease alerts",
    icon: "🐛",
    to: "/pest-disease?mode=prediction",
    gradient: "from-red-500 to-rose-400",
    bgGlow: "bg-red-50",
  },
  {
    id: "image",
    label: "Image Disease Detection",
    desc: "Upload leaf images for analysis",
    icon: "🔬",
    to: "/pest-disease?mode=image",
    gradient: "from-purple-500 to-violet-400",
    bgGlow: "bg-purple-50",
  },
  {
    id: "fertigation",
    label: "Fertigation Advisory",
    desc: "Optimal nutrient schedules",
    icon: "💧",
    to: "/agricultural?service=fertigation",
    gradient: "from-teal-500 to-cyan-400",
    bgGlow: "bg-teal-50",
  },
  {
    id: "iot",
    label: "IoT & Irrigation",
    desc: "MQTT monitoring & control",
    icon: "🌐",
    to: "/iot",
    gradient: "from-indigo-500 to-blue-400",
    bgGlow: "bg-indigo-50",
  },
  {
    id: "ai",
    label: "AI Analytics",
    desc: "Deep insights & forecasting",
    icon: "🤖",
    to: "/ai",
    gradient: "from-fuchsia-500 to-pink-400",
    bgGlow: "bg-fuchsia-50",
  },
];

function ServiceCard({ service }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(service.to)}
      className="group relative overflow-hidden rounded-xl border border-gaas-border bg-white p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-transparent cursor-pointer"
    >
      {/* Gradient top accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${service.gradient} opacity-60 transition-opacity duration-300 group-hover:opacity-100`}
      />
      {/* Icon circle */}
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${service.bgGlow} text-lg transition-transform duration-300 group-hover:scale-110`}
      >
        {service.icon}
      </div>
      <h3 className="text-sm font-bold text-gaas-heading leading-tight mb-1">
        {service.label}
      </h3>
      <p className="text-[11px] text-gaas-muted leading-snug">{service.desc}</p>
      {/* Hover arrow */}
      <span className="absolute bottom-3 right-3 text-xs text-gaas-accent opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
        →
      </span>
    </button>
  );
}

/* ── Stat Mini-Card ────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, accent = "text-gaas-accent" }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gaas-accent-glow text-base shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gaas-muted truncate">
          {label}
        </p>
        <p className={`text-lg font-bold leading-tight ${accent} tabular-nums`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Live Clock ────────────────────────────────────────────────────────────── */

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <time className="text-xs tabular-nums text-gaas-muted font-medium">
      {now.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })}{" "}
      · {now.toLocaleTimeString()}
    </time>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, isGuest } = useAuth();
  const { realtime, alerts, lastUpdated, loading, error } = useSensors();
  const { rows, loading: rowsLoading } = useRows();
  const { plan, planExpiresAt } = useSubscription();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedBag, setSelectedBag] = useState(null);

  useEffect(() => {
    if (isGuest) {
      setHistoryLoading(false);
      setPaymentHistory([]);
      setHistoryError("");
      return;
    }
    let active = true;
    (async () => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        await ensureAppJwtFromGoogleIdToken();
        if (!getAuthToken()) {
          if (!active) return;
          setHistoryError(`Could not load purchase history — no valid API token. ${getMissingAppJwtHelpText()}`);
          setHistoryLoading(false);
          return;
        }

        const load = () => api.get("/subscription/history");
        let res;
        try {
          res = await load();
        } catch (e) {
          if (e?.response?.status === 401) {
            await ensureAppJwtFromGoogleIdToken();
            res = await load();
          } else {
            throw e;
          }
        }
        if (!active) return;
        const data = res.data;
        setPaymentHistory(Array.isArray(data?.payments) ? data.payments : []);
      } catch (err) {
        if (!active) return;
        setHistoryError(err?.response?.data?.error || err?.message || "Unable to load purchase history");
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isGuest]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const displayName = isGuest
    ? "Guest"
    : user?.name || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6 animate-in">
      {/* ─── Hero Header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gaas-accent via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {greeting}, {displayName} 👋
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Your greenhouse command center — everything at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LiveClock />
            <Link
              to="/help"
              className="rounded-lg bg-white/15 backdrop-blur px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm text-red-700 font-medium">
          {error === "Network Error" ? "⚠️ Network Error — sensor data may be stale" : error}
        </div>
      )}

      {/* ─── Quick Stats Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="📋"
          label="Plan"
          value={formatPlanDisplayName(plan)}
          accent={
            isPaidPremiumPlan(plan) ? "text-gaas-accent" : "text-sky-600"
          }
        />
        <StatCard
          icon="🌡️"
          label="Temperature"
          value={
            realtime?.temperature != null
              ? `${Number(realtime.temperature).toFixed(1)}°C`
              : "--"
          }
        />
        <StatCard
          icon="💧"
          label="Humidity"
          value={
            realtime?.humidity != null
              ? `${Number(realtime.humidity).toFixed(1)}%`
              : "--"
          }
        />
        <StatCard
          icon="🌍"
          label="Soil Moisture"
          value={
            realtime?.soil_moisture != null
              ? `${Number(realtime.soil_moisture).toFixed(1)}%`
              : "--"
          }
        />
      </div>

      {/* ─── Services Quick Access ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
            Quick Access — Services
          </h2>
          <Link
            to="/services"
            className="text-xs font-semibold text-gaas-accent hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SERVICES.map((svc) => (
            <ServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      </section>

      {/* ─── Subscription & Plan Info ─────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Subscription card */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gaas-accent-glow text-[10px]">
              ⭐
            </span>
            Subscription
          </h2>
          {isGuest ? (
            <p className="text-sm text-gaas-text">
              Guest mode: dashboard access is available. Other modules follow the admin-controlled guest access settings.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                    isPaidPremiumPlan(plan)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {formatPlanDisplayName(plan)}
                </span>
                {!isPaidPremiumPlan(plan) && (
                  <Link
                    to="/subscription"
                    className="text-[11px] font-semibold text-gaas-accent hover:underline"
                  >
                    Upgrade →
                  </Link>
                )}
              </div>
              <p className="text-xs text-gaas-muted">
                Expires:{" "}
                {planExpiresAt
                  ? new Date(planExpiresAt).toLocaleDateString()
                  : isPaidPremiumPlan(plan)
                  ? "—"
                  : "— (free Basic)"}
              </p>
            </>
          )}
        </div>

        {/* Purchase history card */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gaas-accent-glow text-[10px]">
              🧾
            </span>
            Purchase History
          </h2>
          {isGuest ? (
            <p className="text-sm text-gaas-muted">Sign in to see purchase history.</p>
          ) : historyLoading ? (
            <p className="text-sm text-gaas-muted animate-pulse">Loading purchases...</p>
          ) : historyError ? (
            <p className="text-sm text-red-600">{historyError}</p>
          ) : paymentHistory.length === 0 ? (
            <p className="text-sm text-gaas-muted">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gaas-border">
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-gaas-muted uppercase">Date</th>
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-gaas-muted uppercase">Plan</th>
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-gaas-muted uppercase">Amount</th>
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-gaas-muted uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.slice(0, 5).map((p) => (
                    <tr key={p.id || p.paymentId} className="border-b border-gaas-border/30">
                      <td className="py-2 pr-3 text-xs">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="py-2 pr-3 text-xs font-medium">{p.planName || "-"}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums">₹{((Number(p.amount) || 0) / 100).toFixed(2)}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            p.status === "captured" || p.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : p.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paymentHistory.length > 5 && (
                <Link to="/billing#history" className="block mt-2 text-xs text-gaas-accent font-semibold hover:underline text-center">
                  View all {paymentHistory.length} transactions →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Realtime Sensors (Detailed) ──────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gaas-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gaas-accent" />
            </span>
            Live Sensors
          </h2>
          {lastUpdated && (
            <p className="text-[11px] text-gaas-muted tabular-nums">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {["temperature", "humidity", "soil_moisture"].map((key) => (
            <SensorCard key={key} sensorKey={key} value={realtime?.[key]} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {["ph", "ec"].map((key) => (
            <SensorCard key={key} sensorKey={key} value={realtime?.[key]} />
          ))}
        </div>
      </div>

      {/* ─── Health Score + Alerts ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gaas-accent-glow text-[10px]">
              💚
            </span>
            Plant Health Score
          </h2>
          <HealthIndicator score={realtime?.healthScore} />
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gaas-accent-glow text-[10px]">
              🔔
            </span>
            Alerts
          </h2>
          <AlertBanner alerts={alerts} />
        </div>
      </div>

      {/* ─── Greenhouse Structure ─────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gaas-accent-glow text-[10px]">
            🏠
          </span>
          Greenhouse Structure
        </h2>
        {rowsLoading ? (
          <div className="glass-card p-8 text-center text-gaas-muted animate-pulse">Loading rows...</div>
        ) : (
          <RowGrid rows={rows} onSelectRow={setSelectedRow} />
        )}
      </section>

      {/* Drill-down Level 2 — Bags in selected row */}
      {selectedRow && (
        <BagGrid row={selectedRow} onSelectBag={setSelectedBag} onBack={() => setSelectedRow(null)} />
      )}

      {/* Drill-down Level 3 — Plant detail modal */}
      {selectedBag && selectedRow && (
        <PlantDetailModal row={selectedRow} bag={selectedBag} onClose={() => setSelectedBag(null)} />
      )}
    </div>
  );
}

function BagGrid({ row, onSelectBag, onBack }) {
  const { bags, loading } = useBags(row);

  return (
    <div className="animate-in">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="btn-secondary text-xs px-3 py-1.5">← Back</button>
        <h2 className="text-sm font-semibold text-gaas-heading capitalize">{row.replace("row", "Row ")} — Bags</h2>
      </div>
      {loading ? (
        <div className="glass-card p-6 text-center text-gaas-muted">Loading bags...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bags.map((b) => (
            <button
              key={b.bag}
              onClick={() => onSelectBag(b.bag)}
              className="glass-card p-4 text-left hover:border-gaas-accent/40 hover:shadow-glow transition-all duration-300 cursor-pointer"
            >
              <h3 className="text-sm font-semibold text-gaas-heading capitalize mb-2">
                🪴 {b.bag.replace("bag", "Bag ")}
              </h3>
              {b.latestReading && (
                <div className="text-xs space-y-1 text-gaas-muted mb-2">
                  <p>🌡️ {b.latestReading.temperature?.toFixed(1)}°C</p>
                  <p>💧 {b.latestReading.humidity?.toFixed(1)}%</p>
                  <p>🌍 {b.latestReading.soil_moisture?.toFixed(1)}%</p>
                </div>
              )}
              <HealthIndicator score={b.healthScore} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
