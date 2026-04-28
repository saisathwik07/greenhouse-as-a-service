import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { flaskUrl } from "../lib/flaskBaseUrl";

const LIVE_DATA_URL = flaskUrl("/live-data");
const POLL_MS = 2000;
const TEMP_HISTORY_LEN = 10;

function classifyFetchError(err) {
  if (!err) return "Unknown error";
  const msg = String(err.message || err);
  if (err instanceof TypeError || msg === "Failed to fetch") {
    return { kind: "network", message: "Failed to fetch" };
  }
  return { kind: "other", message: msg };
}

export default function LiveDataPage() {
  const [sensorData, setSensorData] = useState({});
  const [tempHistory, setTempHistory] = useState([]);
  const [live, setLive] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!live) return undefined;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(LIVE_DATA_URL, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
        });
        if (cancelled) return;

        if (!res.ok) {
          setFetchError(`Server returned ${res.status} ${res.statusText}`);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        console.log("[live-data]", data);
        setFetchError(null);
        setSensorData(data);

        const t = Number(data.temperature);
        if (Number.isFinite(t)) {
          setTempHistory((prev) => [...prev, t].slice(-TEMP_HISTORY_LEN));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[live-data]", err);
        const { message } = classifyFetchError(err);
        setFetchError(message);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [live]);

  const chartData = {
    labels: tempHistory.map((_, i) => `${i + 1}`),
    datasets: [
      {
        label: "Temperature (°C)",
        data: tempHistory,
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: "Temperature (last 10 samples)" },
    },
    scales: {
      y: { title: { display: true, text: "°C" } },
    },
  };

  const pumpRaw = sensorData.pump_status;
  const pumpOn =
    pumpRaw === true ||
    pumpRaw === 1 ||
    (typeof pumpRaw === "string" &&
      ["on", "true", "1", "running", "yes"].includes(String(pumpRaw).trim().toLowerCase()));

  const fmt = (v) =>
    v === null || v === undefined ? "—" : typeof v === "number" ? v.toFixed(1) : String(v);

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gaas-heading">Live greenhouse data</h1>
          <p className="text-sm text-gaas-muted mt-0.5">
            Fetching <code className="text-xs bg-gray-100 px-1 rounded">{LIVE_DATA_URL}</code> every{" "}
            {POLL_MS / 1000}s
            {import.meta.env.DEV && (
              <span className="block text-xs mt-1 text-gray-500">
                Dev proxy → Flask at http://localhost:5000/live-data (see vite.config.js)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              live
                ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400/50"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
            />
            Live Sensor Active
          </span>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gaas-border bg-white hover:bg-gray-50"
          >
            {live ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2 text-sm">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gaas-muted uppercase tracking-wide">Temperature</p>
          <p className="text-2xl font-semibold text-gaas-heading mt-1">
            {fmt(num(sensorData.temperature))} °C
          </p>
        </div>
        <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gaas-muted uppercase tracking-wide">Humidity</p>
          <p className="text-2xl font-semibold text-gaas-heading mt-1">
            {fmt(num(sensorData.humidity))} %
          </p>
        </div>
        <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gaas-muted uppercase tracking-wide">Soil moisture</p>
          <p className="text-2xl font-semibold text-gaas-heading mt-1">
            {fmt(num(sensorData.soil_moisture))}
          </p>
        </div>
        <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm sm:col-span-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gaas-muted uppercase tracking-wide">Pump status</p>
            <p
              className={`text-xl font-bold mt-1 ${pumpOn ? "text-emerald-600" : "text-rose-600"}`}
            >
              {sensorData.pump_status != null ? String(sensorData.pump_status) : "—"}
            </p>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              pumpOn ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {pumpOn ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-gaas-muted uppercase tracking-wide mb-2">Alert</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {sensorData.alert != null && sensorData.alert !== "" ? String(sensorData.alert) : "—"}
        </p>
      </div>

      <div className="rounded-xl border border-gaas-border bg-white p-4 shadow-sm h-64">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 overflow-x-auto">
        <p className="text-xs font-semibold text-gray-500 mb-2">Debug</p>
        <pre className="text-xs text-left font-mono text-gray-800">
          {JSON.stringify(sensorData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
