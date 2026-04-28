import { useState, useMemo, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import ChartContainer from "../components/ChartContainer";
import SensorCard from "../components/SensorCard";
import { useSensors, useSensorHistory } from "../hooks/useSensors";
import { useSubscription } from "../hooks/useSubscription";
import { api } from "../api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const QUICK_FILTERS = [
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "72h", hours: 72 }
];

const SENSOR_COLORS = {
  temperature: { border: "#38BDF8", bg: "rgba(56,189,248,0.1)" },
  humidity: { border: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  soil_moisture: { border: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  ph: { border: "#A78BFA", bg: "rgba(167,139,250,0.1)" },
  ec: { border: "#F472B6", bg: "rgba(244,114,182,0.1)" }
};

export default function DataPage() {
  const { canAccess } = useSubscription();
  const canDownload = canAccess("downloadData");
  const [activeTab, setActiveTab] = useState("realtime");
  const [timeRange, setTimeRange] = useState(24);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibleSensors, setVisibleSensors] = useState(["temperature", "humidity", "soil_moisture"]);

  const { realtime, lastUpdated } = useSensors();
  const { history, loading: historyLoading, refetch: refetchHistory } = useSensorHistory({ hours: timeRange });

  const toggleSensor = (key) => {
    setVisibleSensors((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleQuickFilter = (hours) => {
    setTimeRange(hours);
    setStartDate("");
    setEndDate("");
    refetchHistory(hours);
  };

  const handleCustomRange = () => {
    if (!startDate || !endDate) return;
    const hours = Math.ceil((new Date(endDate) - new Date(startDate)) / 3600000);
    setTimeRange(hours);
    refetchHistory(hours);
  };

  const chartData = useMemo(() => ({
    labels: history.map((r) => {
      const d = new Date(r.timestamp);
      return history.length > 100 ? d.toLocaleDateString() : d.toLocaleTimeString();
    }),
    datasets: visibleSensors.map((key) => ({
      label: key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      data: history.map((r) => r[key]),
      borderColor: SENSOR_COLORS[key]?.border || "#94A3B8",
      backgroundColor: SENSOR_COLORS[key]?.bg || "rgba(148,163,184,0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: history.length > 50 ? 0 : 3
    }))
  }), [history, visibleSensors]);

  const handleDownload = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("start", new Date(Date.now() - timeRange * 3600000).toISOString());
      params.set("end", new Date().toISOString());
      params.set("sensors", visibleSensors.join(","));
      const res = await api.get(`/sensors/download?${params}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `sensor_data_${timeRange}h.csv`;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    }
  }, [timeRange, visibleSensors]);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-gaas-heading">Data</h1>
        <p className="text-sm text-gaas-muted mt-0.5">Realtime and historical sensor data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gaas-bg p-1 rounded-lg w-fit">
        {["realtime", "historical"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 capitalize ${
              activeTab === tab
                ? "bg-gaas-accent text-gaas-bg shadow-glow"
                : "text-gaas-muted hover:text-gaas-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "realtime" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {["temperature", "humidity", "soil_moisture", "ph", "ec"].map((key) => (
              <SensorCard key={key} sensorKey={key} value={realtime?.[key]} />
            ))}
          </div>
          <p className="text-xs text-gaas-muted text-right">
            Auto-refreshing every 5s • Last: {lastUpdated ? new Date(lastUpdated).toLocaleString() : "--"}
          </p>
        </div>
      )}

      {activeTab === "historical" && (
        <div className="space-y-4">
          {/* Quick Filters + Date Range */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1">
              {QUICK_FILTERS.map(({ label, hours }) => (
                <button
                  key={hours}
                  onClick={() => handleQuickFilter(hours)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    timeRange === hours && !startDate
                      ? "bg-gaas-accent text-gaas-bg"
                      : "btn-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="text-[10px] text-gaas-muted block mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gaas-muted block mb-1">End</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <button onClick={handleCustomRange} className="btn-primary text-xs px-3 py-2">
                Apply
              </button>
            </div>
          </div>

          {/* Sensor Toggles */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(SENSOR_COLORS).map((key) => (
              <button
                key={key}
                onClick={() => toggleSensor(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  visibleSensors.includes(key)
                    ? "border-transparent text-gaas-bg"
                    : "border-gaas-border text-gaas-muted bg-transparent"
                }`}
                style={
                  visibleSensors.includes(key)
                    ? { backgroundColor: SENSOR_COLORS[key].border }
                    : {}
                }
              >
                {key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Chart */}
          {historyLoading ? (
            <div className="glass-card p-12 text-center text-gaas-muted animate-pulse-slow">Loading chart data...</div>
          ) : (
            <ChartContainer
              title={`Sensor History — Last ${timeRange}h`}
              data={chartData}
              onDownload={canDownload ? handleDownload : undefined}
              height={360}
            />
          )}

          <p className="text-xs text-gaas-muted">{history.length} data points</p>
          {!canDownload && (
            <div className="text-xs rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 px-3 py-2">
              🔒 Upgrade Required — Download Recent Data is available on Basic, Standard, and Premium plans.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
