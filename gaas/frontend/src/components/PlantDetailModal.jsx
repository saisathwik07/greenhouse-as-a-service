import { useEffect, useState } from "react";
import { api } from "../api";
import SensorCard from "./SensorCard";
import HealthIndicator from "./HealthIndicator";
import ChartContainer from "./ChartContainer";

export default function PlantDetailModal({ row, bag, onClose }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await api.get(`/sensors/rows/${row}/bags/${bag}`);
        if (!cancelled) {
          setData(res.data.data);
          setHistory(res.data.history || []);
        }
      } catch (err) {
        console.error("Failed to load bag detail", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [row, bag]);

  const chartData = {
    labels: history.map((r) => new Date(r.timestamp).toLocaleTimeString()),
    datasets: [
      { label: "Temperature", data: history.map((r) => r.temperature), borderColor: "#2563EB", tension: 0.4 },
      { label: "Humidity", data: history.map((r) => r.humidity), borderColor: "#16A34A", tension: 0.4 },
      { label: "Soil Moisture", data: history.map((r) => r.soil_moisture), borderColor: "#D97706", tension: 0.4 }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-in border border-gaas-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gaas-heading">
              {row?.replace("row", "Row ")} → {bag?.replace("bag", "Bag ")}
            </h2>
            <p className="text-xs text-gaas-muted">Individual unit detail view</p>
          </div>
          <button onClick={onClose} className="text-gaas-muted hover:text-gaas-heading p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gaas-muted">Loading...</div>
        ) : !data ? (
          <div className="text-center py-12 text-gaas-muted">No data for this unit</div>
        ) : (
          <div className="space-y-5">
            <HealthIndicator score={data.healthScore} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {["temperature", "humidity", "soil_moisture", "ph", "ec"].map((key) => (
                <SensorCard key={key} sensorKey={key} value={data[key]} />
              ))}
            </div>
            {history.length > 0 && (
              <ChartContainer title="Recent History" data={chartData} height={220} />
            )}
            <p className="text-[11px] text-gaas-muted text-right">
              Last reading: {data.timestamp ? new Date(data.timestamp).toLocaleString() : "--"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
