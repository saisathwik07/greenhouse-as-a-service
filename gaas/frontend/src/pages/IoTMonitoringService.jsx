import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { api } from "../api";
import UpgradeLock from "../components/UpgradeLock";
import { useSubscription } from "../hooks/useSubscription";

const REFRESH_MS = 5000;
const HISTORY_HOURS = 24;
const MAX_TIMELINE_POINTS = 60;

const SENSOR_RANGES = {
  temperature: { healthy: [20, 30], unit: "°C", label: "Temperature" },
  humidity: { healthy: [55, 80], unit: "%", label: "Humidity" },
  soil_moisture: { healthy: [40, 70], unit: "%", label: "Soil moisture" },
  ph: { healthy: [5.5, 7.0], unit: "", label: "pH" },
  ec: { healthy: [1.0, 2.2], unit: "mS/cm", label: "EC" },
};

function classifyReading(key, value) {
  const range = SENSOR_RANGES[key];
  if (!range || value == null || Number.isNaN(value)) return "unknown";
  const [lo, hi] = range.healthy;
  if (value >= lo && value <= hi) return "healthy";
  const span = hi - lo || 1;
  if (value < lo - span * 0.4 || value > hi + span * 0.4) return "alert";
  return "warn";
}

const STATUS_COLORS = {
  healthy: { dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200" },
  alert: { dot: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200" },
  unknown: { dot: "bg-gray-300", text: "text-gray-500", ring: "ring-gray-200" },
};

function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function formatRelative(iso) {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  return `${Math.round(diff / 3_600_000)} hr ago`;
}

function MetricCard({ icon, label, value, unit, status, healthyRange }) {
  const palette = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  return (
    <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gaas-muted">
          {icon} {label}
        </p>
        <span className={`h-2 w-2 rounded-full ${palette.dot}`} aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-bold leading-tight text-gaas-heading">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-gaas-muted">{unit}</span>}
      </p>
      <p className={`mt-0.5 text-[11px] font-semibold ${palette.text}`}>
        {status === "healthy"
          ? "Within optimal range"
          : status === "warn"
          ? "Drifting"
          : status === "alert"
          ? "Out of range"
          : "Awaiting data"}
        {healthyRange && (
          <span className="ml-1 font-normal text-gaas-muted">
            ({healthyRange[0]}–{healthyRange[1]})
          </span>
        )}
      </p>
    </div>
  );
}

function DeviceRow({ device }) {
  const palette = STATUS_COLORS[device.status] || STATUS_COLORS.unknown;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 ${
        device.status === "healthy"
          ? "border-emerald-100"
          : device.status === "warn"
          ? "border-amber-100"
          : device.status === "alert"
          ? "border-rose-100"
          : "border-gaas-border"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${palette.dot}`} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gaas-heading">{device.label}</p>
          <p className="truncate text-[11px] text-gaas-muted">{device.detail}</p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ring-1 ${palette.text} ${palette.ring} bg-white`}
      >
        {device.status === "healthy"
          ? "Online"
          : device.status === "warn"
          ? "Drifting"
          : device.status === "alert"
          ? "Critical"
          : "Offline"}
      </span>
    </div>
  );
}

export default function IoTMonitoringService() {
  const { canAccess } = useSubscription();
  const allowed = canAccess("liveData") || canAccess("mqtt");

  const [latest, setLatest] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [rows, setRows] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);

  const cancelRef = useRef(false);
  useEffect(() => () => { cancelRef.current = true; }, []);

  /* Real-time polling: backend in-memory simulator + MongoDB-backed history. */
  useEffect(() => {
    if (!allowed || !live) return undefined;
    let cancelled = false;

    const fetchRealtime = async () => {
      try {
        const [rt, rowsRes] = await Promise.all([
          api.get("/sensors/realtime"),
          api.get("/sensors/rows"),
        ]);
        if (cancelled) return;
        setLatest(rt.data?.data || null);
        setAlerts(Array.isArray(rt.data?.alerts) ? rt.data.alerts : []);
        setLastUpdated(rt.data?.lastUpdated || new Date().toISOString());
        setRows(Array.isArray(rowsRes.data?.data) ? rowsRes.data.data : []);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.error || err.message || "Failed to fetch sensor data");
      }
    };

    fetchRealtime();
    const id = window.setInterval(fetchRealtime, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [allowed, live]);

  /* History — refreshed once per minute, separate from realtime so we don't
   * spam the backend with full-history payloads. */
  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - HISTORY_HOURS * 3600 * 1000);
        const { data } = await api.get("/sensors/history", {
          params: { start: start.toISOString(), end: end.toISOString() },
        });
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setHistory(list.slice(-MAX_TIMELINE_POINTS));
      } catch {
        /* keep last good history */
      }
    };

    fetchHistory();
    const id = window.setInterval(fetchHistory, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [allowed]);

  /* Wall-clock tick so "x sec ago" stays fresh without re-fetching. */
  useEffect(() => {
    if (!live) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const sensorMetrics = useMemo(() => {
    if (!latest) return [];
    return [
      { key: "temperature", icon: "🌡️", value: latest.temperature, digits: 1 },
      { key: "humidity", icon: "💧", value: latest.humidity, digits: 1 },
      { key: "soil_moisture", icon: "🌱", value: latest.soil_moisture, digits: 1 },
      { key: "ph", icon: "⚗️", value: latest.ph, digits: 2 },
      { key: "ec", icon: "⚡", value: latest.ec, digits: 2 },
    ].map((m) => {
      const meta = SENSOR_RANGES[m.key];
      return {
        ...m,
        label: meta.label,
        unit: meta.unit,
        status: classifyReading(m.key, Number(m.value)),
        healthyRange: meta.healthy,
      };
    });
  }, [latest]);

  const devices = useMemo(() => {
    const stale = lastUpdated && Date.now() - new Date(lastUpdated).getTime() > 30_000;
    const sensorStatus = stale
      ? "alert"
      : alerts.length > 0
      ? "warn"
      : latest
      ? "healthy"
      : "unknown";
    const moisture = Number(latest?.soil_moisture);
    const pumpRunning = Number.isFinite(moisture) && moisture < 40;
    const phVal = Number(latest?.ph);
    const phStatus = !Number.isFinite(phVal)
      ? "unknown"
      : phVal < 5.0 || phVal > 7.5
      ? "alert"
      : phVal < 5.5 || phVal > 7.0
      ? "warn"
      : "healthy";

    return [
      {
        id: "sensor-array",
        label: "Sensor array",
        detail: `${rows.length || 0} row${rows.length === 1 ? "" : "s"} reporting · refresh ${
          REFRESH_MS / 1000
        }s`,
        status: sensorStatus,
      },
      {
        id: "irrigation-pump",
        label: "Irrigation pump",
        detail: pumpRunning
          ? `Active — soil moisture ${formatNumber(moisture, 0)}%`
          : `Idle — soil moisture ${formatNumber(moisture, 0)}%`,
        status: pumpRunning ? "warn" : "healthy",
      },
      {
        id: "ph-controller",
        label: "pH controller",
        detail: `Reading ${formatNumber(phVal, 2)}${phStatus === "healthy" ? " · in range" : " · attention"}`,
        status: phStatus,
      },
      {
        id: "data-bridge",
        label: "Data bridge",
        detail: stale
          ? `Last packet ${formatRelative(lastUpdated)} — connection stalled`
          : `Streaming — last packet ${formatRelative(lastUpdated)}`,
        status: stale ? "alert" : "healthy",
      },
    ];
  }, [latest, rows, alerts, lastUpdated, tick]);

  const chartData = useMemo(() => {
    if (history.length === 0) return null;
    const labels = history.map((row) =>
      new Date(row.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    return {
      labels,
      datasets: [
        {
          label: "Temperature (°C)",
          data: history.map((r) => Number(r.temperature) || null),
          borderColor: "#16A34A",
          backgroundColor: "rgba(22,163,74,0.10)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y",
        },
        {
          label: "Humidity (%)",
          data: history.map((r) => Number(r.humidity) || null),
          borderColor: "#0EA5E9",
          backgroundColor: "rgba(14,165,233,0.08)",
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
        {
          label: "Soil moisture (%)",
          data: history.map((r) => Number(r.soil_moisture) || null),
          borderColor: "#8B5CF6",
          backgroundColor: "rgba(139,92,246,0.08)",
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
      ],
    };
  }, [history]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 10, font: { family: "Inter", size: 12 }, color: "#374151" },
        },
        tooltip: {
          backgroundColor: "#FFFFFF",
          titleColor: "#111827",
          bodyColor: "#374151",
          borderColor: "#E5E7EB",
          borderWidth: 1,
          padding: 8,
        },
      },
      scales: {
        x: {
          ticks: { color: "#6B7280", font: { size: 10 } },
          grid: { color: "rgba(229,231,235,0.6)" },
        },
        y: {
          position: "left",
          ticks: { color: "#16A34A", font: { size: 11 } },
          grid: { color: "rgba(229,231,235,0.85)" },
          title: { display: true, text: "°C", color: "#16A34A", font: { size: 11 } },
        },
        y1: {
          position: "right",
          ticks: { color: "#6B7280", font: { size: 11 } },
          grid: { drawOnChartArea: false },
          title: { display: true, text: "%", color: "#6B7280", font: { size: 11 } },
        },
      },
    }),
    []
  );

  const stale = lastUpdated && Date.now() - new Date(lastUpdated).getTime() > 30_000;
  const overallStatus = stale
    ? "alert"
    : alerts.length > 0
    ? "warn"
    : latest
    ? "healthy"
    : "unknown";
  const overallPalette = STATUS_COLORS[overallStatus];

  return (
    <div className="relative space-y-6 animate-in">
      <div className={allowed ? "" : "pointer-events-none blur-[1px] select-none space-y-6"}>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gaas-accent">
              IoT Monitoring as a Service
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gaas-heading">
              Live greenhouse monitoring
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gaas-muted">
              Real-time sensor stream, device status, historical analytics and
              alerts. Auto-refreshes every {REFRESH_MS / 1000}s.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 bg-white ${overallPalette.text} ${overallPalette.ring}`}
            >
              <span className={`h-2 w-2 rounded-full ${overallPalette.dot}`} />
              {overallStatus === "healthy"
                ? "All systems healthy"
                : overallStatus === "warn"
                ? `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}`
                : overallStatus === "alert"
                ? "Connection stalled"
                : "Awaiting first packet"}
            </span>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className="btn-secondary text-sm"
            >
              {live ? "Pause" : "Resume"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        )}

        {/* Sensor cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {sensorMetrics.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[110px] rounded-xl border border-dashed border-gaas-border bg-white"
                />
              ))
            : sensorMetrics.map((m) => (
                <MetricCard
                  key={m.key}
                  icon={m.icon}
                  label={m.label}
                  value={formatNumber(m.value, m.digits)}
                  unit={m.unit}
                  status={m.status}
                  healthyRange={m.healthyRange}
                />
              ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Live analytics chart */}
          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gaas-heading">Live analytics</h2>
                <p className="text-[11px] text-gaas-muted">
                  Last {HISTORY_HOURS} hours · auto-aggregated
                </p>
              </div>
              <p className="text-[11px] text-gaas-muted">
                Updated {formatRelative(lastUpdated)}
              </p>
            </div>
            <div className="h-[280px] w-full">
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gaas-muted">
                  Loading historical readings…
                </div>
              )}
            </div>
          </div>

          {/* Device status */}
          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gaas-heading">Device status</h2>
              <p className="text-[11px] text-gaas-muted">Health per controller</p>
            </div>
            <div className="space-y-2">
              {devices.map((d) => (
                <DeviceRow key={d.id} device={d} />
              ))}
            </div>
          </div>
        </div>

        {/* Alerts + zone summary */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gaas-heading">Active alerts</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gaas-muted">
                {alerts.length}
              </span>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-gaas-muted">No active alerts. Conditions nominal.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a, idx) => (
                  <li
                    key={`${a.type}-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      <span className="font-semibold">{a.message || a.type}</span>
                      <span className="ml-1 text-[11px] opacity-70">[{a.type}]</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gaas-heading">Zones</h2>
              <p className="text-[11px] text-gaas-muted">
                {rows.length} active row{rows.length === 1 ? "" : "s"} · health computed from latest
                readings
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-gaas-muted">No zones reporting yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-gaas-border text-left text-[11px] uppercase tracking-wider text-gaas-muted">
                      <th className="py-2 pr-4 font-semibold">Zone</th>
                      <th className="py-2 pr-4 font-semibold">Bags</th>
                      <th className="py-2 pr-4 font-semibold">Temp</th>
                      <th className="py-2 pr-4 font-semibold">Humidity</th>
                      <th className="py-2 font-semibold">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const lr = r.latestReading || {};
                      const score = Number(r.healthScore || 0);
                      const tone =
                        score >= 40
                          ? STATUS_COLORS.healthy
                          : score >= 25
                          ? STATUS_COLORS.warn
                          : STATUS_COLORS.alert;
                      return (
                        <tr key={r.row} className="border-b border-gaas-border/60 last:border-b-0">
                          <td className="py-2 pr-4 font-semibold text-gaas-heading">{r.row}</td>
                          <td className="py-2 pr-4 text-gaas-text">{r.bagCount}</td>
                          <td className="py-2 pr-4 text-gaas-text tabular-nums">
                            {formatNumber(lr.temperature, 1)}°C
                          </td>
                          <td className="py-2 pr-4 text-gaas-text tabular-nums">
                            {formatNumber(lr.humidity, 1)}%
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone.text} ${tone.ring}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                              {score}/50
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {!allowed && (
        <UpgradeLock
          title="Upgrade Required"
          message="The IoT Monitoring service is included on Standard and Premium plans."
        />
      )}
    </div>
  );
}
