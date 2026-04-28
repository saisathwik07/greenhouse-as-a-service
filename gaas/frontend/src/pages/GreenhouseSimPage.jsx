import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { flaskUrl } from "../lib/flaskBaseUrl";
import UpgradeLock from "../components/UpgradeLock";
import { useSubscription } from "../hooks/useSubscription";

const LIVE_DATA_URL = flaskUrl("/live-data");
const POLL_MS = 2000;
const MAX_POINTS = 24;

export default function GreenhouseSimPage() {
  const { canAccess } = useSubscription();
  const allowed = canAccess("greenhouseSim");
  const [live, setLive] = useState(true);
  const [sensor, setSensor] = useState(null);
  const [error, setError] = useState(null);
  const [chartLabels, setChartLabels] = useState([]);
  const [tempSeries, setTempSeries] = useState([]);
  const [moistSeries, setMoistSeries] = useState([]);
  const [phSeries, setPhSeries] = useState([]);
  const [condSeries, setCondSeries] = useState([]);

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
          setError(`Server returned ${res.status}`);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        console.log("[greenhouse /live-data]", data);
        setError(null);
        setSensor(data);

        const label = new Date().toLocaleTimeString();
        setChartLabels((prev) => [...prev.slice(-(MAX_POINTS - 1)), label]);
        setTempSeries((prev) => [...prev.slice(-(MAX_POINTS - 1)), Number(data.temperature)]);
        setMoistSeries((prev) => [...prev.slice(-(MAX_POINTS - 1)), Number(data.soil_moisture)]);
        const ph = Number(data.ph);
        const cond = Number(data.conductivity ?? data.soil_conductivity);
        setPhSeries((prev) => [...prev.slice(-(MAX_POINTS - 1)), Number.isFinite(ph) ? ph : null]);
        setCondSeries((prev) => [
          ...prev.slice(-(MAX_POINTS - 1)),
          Number.isFinite(cond) ? cond : null,
        ]);
      } catch (e) {
        if (cancelled) return;
        console.error("[greenhouse]", e);
        const msg = e?.message === "Failed to fetch" || e instanceof TypeError;
        setError(msg ? "Failed to fetch" : String(e.message || e));
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [live]);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Temperature (°C)",
        data: tempSeries,
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.25,
        yAxisID: "y",
      },
      {
        label: "Soil moisture (%)",
        data: moistSeries,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        fill: true,
        tension: 0.25,
        yAxisID: "y1",
      },
      {
        label: "pH",
        data: phSeries,
        borderColor: "rgb(245, 158, 11)",
        backgroundColor: "rgba(245, 158, 11, 0.06)",
        fill: false,
        tension: 0.25,
        pointRadius: 2,
        spanGaps: true,
        yAxisID: "y2",
      },
      {
        label: "Conductivity",
        data: condSeries,
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.06)",
        fill: false,
        tension: 0.25,
        pointRadius: 2,
        spanGaps: true,
        yAxisID: "y3",
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Live temperature, soil moisture, pH & conductivity",
      },
    },
    scales: {
      y: {
        title: { display: true, text: "°C" },
        position: "left",
      },
      y1: {
        title: { display: true, text: "Moisture (%)" },
        position: "right",
        grid: { drawOnChartArea: false },
      },
      y2: {
        title: { display: true, text: "pH" },
        position: "right",
        offset: true,
        grid: { drawOnChartArea: false },
        suggestedMin: 4,
        suggestedMax: 9,
      },
      y3: {
        title: { display: true, text: "Conductivity" },
        position: "right",
        offset: true,
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div className="relative space-y-6">
      <div className={allowed ? "" : "pointer-events-none blur-[1px] select-none"}>
      <div>
        <h1 className="text-2xl font-bold text-gaas-heading">Greenhouse IoT simulation</h1>
        <p className="text-sm text-gaas-muted mt-1">
          Polling <code className="text-xs bg-gray-50 px-1 rounded">{LIVE_DATA_URL}</code> every{" "}
          {POLL_MS / 1000}s
          {import.meta.env.DEV && (
            <span className="block text-xs mt-1">
              Dev: proxied to <code className="text-xs">http://localhost:5000/live-data</code>
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            live
              ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400/60 animate-pulse"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} />
          {live ? "Live Sensor Active" : "Paused"}
        </span>

        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className="px-4 py-2 rounded-lg bg-gaas-accent text-white text-sm font-medium hover:opacity-90"
        >
          {live ? "Pause" : "Resume"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gaas-border p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gaas-heading mb-4">Latest readings</h2>
          {sensor ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gaas-muted">Humidity</dt>
              <dd className="font-mono font-medium">{sensor.humidity?.toFixed?.(2) ?? sensor.humidity} %</dd>
              <dt className="text-gaas-muted">Temperature</dt>
              <dd className="font-mono font-medium">{sensor.temperature?.toFixed?.(2) ?? sensor.temperature} °C</dd>
              <dt className="text-gaas-muted">Soil moisture</dt>
              <dd className="font-mono font-medium">{sensor.soil_moisture?.toFixed?.(2) ?? sensor.soil_moisture}</dd>
              <dt className="text-gaas-muted">Soil temp</dt>
              <dd className="font-mono font-medium">{sensor.soil_temp?.toFixed?.(2) ?? "—"}</dd>
              <dt className="text-gaas-muted">pH</dt>
              <dd className="font-mono font-medium">{sensor.ph?.toFixed?.(2) ?? sensor.ph}</dd>
              <dt className="text-gaas-muted">Conductivity</dt>
              <dd className="font-mono font-medium">
                {(sensor.conductivity ?? sensor.soil_conductivity)?.toFixed?.(3) ?? "—"}
              </dd>
              <dt className="text-gaas-muted">Pump</dt>
              <dd className="font-mono font-medium">{String(sensor.pump_status ?? "—")}</dd>
              <dt className="text-gaas-muted">Alert</dt>
              <dd className="font-mono font-medium col-span-1">{String(sensor.alert ?? "—")}</dd>
            </dl>
          ) : (
            <p className="text-gaas-muted text-sm">Waiting for data…</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gaas-border p-5 shadow-sm h-80">
          <Line data={chartData} options={chartOpts} />
        </div>
      </div>
      </div>
      {!allowed && (
        <UpgradeLock
          title="Upgrade Required"
          message="Greenhouse Simulation is available on Standard and Premium plans."
        />
      )}
    </div>
  );
}
