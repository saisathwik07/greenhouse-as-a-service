import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import ChartContainer from "../components/ChartContainer";
import ExternalLinkButton from "../components/ExternalLinkButton";
import { api } from "../api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AIPage() {
  const [activeTab, setActiveTab] = useState("prediction");
  const [prediction, setPrediction] = useState(null);
  const [anomaly, setAnomaly] = useState(null);
  const [clustering, setClustering] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [p, a, c] = await Promise.all([
          api.get("/ai/predict"),
          api.get("/ai/anomaly"),
          api.get("/ai/clustering")
        ]);
        setPrediction(p.data);
        setAnomaly(a.data);
        setClustering(c.data);
      } catch (err) {
        console.error("AI data load failed", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const tabs = [
    { key: "prediction", label: "📈 Prediction" },
    { key: "anomaly", label: "🔍 Anomaly Detection" },
    { key: "clustering", label: "🔬 Clustering" }
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gaas-heading">AI Analytics</h1>
          <p className="text-sm text-gaas-muted mt-0.5">Machine learning insights and predictions</p>
        </div>
        <ExternalLinkButton label="Open AI Full View" filePath="/AI.html" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gaas-bg p-1 rounded-lg w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === key
                ? "bg-gaas-accent text-gaas-bg shadow-glow"
                : "text-gaas-muted hover:text-gaas-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-gaas-muted animate-pulse-slow">Loading AI models...</div>
      ) : (
        <>
          {activeTab === "prediction" && prediction && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-gaas-accent/15 text-gaas-accent">{prediction.model}</span>
                </div>
                <p className="text-xs text-gaas-muted">24-hour temperature forecast using time-series analysis</p>
              </div>
              <ChartContainer
                title="Temperature Prediction (Next 24h)"
                data={{
                  labels: prediction.labels?.map((l) => l.split(" ")[1]) || [],
                  datasets: [{
                    label: "Predicted Temperature (°C)",
                    data: prediction.values || [],
                    borderColor: "#38BDF8",
                    backgroundColor: "rgba(56,189,248,0.1)",
                    fill: true,
                    tension: 0.4
                  }]
                }}
                height={300}
              />
            </div>
          )}

          {activeTab === "anomaly" && anomaly && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-gaas-accent/15 text-gaas-accent">{anomaly.model}</span>
                </div>
                <p className="text-xs text-gaas-muted">Detected outliers in sensor readings</p>
              </div>
              <div className="glass-card p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gaas-border">
                        <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Timestamp</th>
                        <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Sensor</th>
                        <th className="text-right text-xs text-gaas-muted font-medium py-2 px-3">Value</th>
                        <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Expected</th>
                        <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(anomaly.rows || []).map((r, i) => (
                        <tr key={i} className="border-b border-gaas-border/50">
                          <td className="py-2 px-3 text-xs tabular-nums">{new Date(r.timestamp).toLocaleString()}</td>
                          <td className="py-2 px-3 text-xs capitalize">{r.sensor}</td>
                          <td className="py-2 px-3 text-xs text-right font-semibold tabular-nums">{r.value}</td>
                          <td className="py-2 px-3 text-xs text-gaas-muted">{r.expectedRange}</td>
                          <td className="py-2 px-3">
                            <span className={`badge ${
                              r.severity === "high" ? "badge-unhealthy" :
                              r.severity === "medium" ? "badge-moderate" : "badge-healthy"
                            }`}>
                              {r.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "clustering" && clustering && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-gaas-accent/15 text-gaas-accent">{clustering.model}</span>
                </div>
                <p className="text-xs text-gaas-muted">Grouping sensor readings into environmental zones</p>
              </div>
              <ChartContainer
                title="Environment Clusters"
                type="bar"
                data={{
                  labels: (clustering.clusters || []).map((c) => c.name),
                  datasets: [{
                    label: "Reading Count",
                    data: (clustering.clusters || []).map((c) => c.count),
                    backgroundColor: ["#22C55E", "#F59E0B", "#38BDF8"],
                    borderRadius: 6
                  }]
                }}
                height={280}
              />
              {/* Cluster detail cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(clustering.clusters || []).map((c, i) => (
                  <div key={c.name} className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-gaas-heading mb-2">{c.name}</h3>
                    <div className="space-y-1 text-xs text-gaas-muted">
                      <p>Readings: <span className="text-gaas-text font-semibold">{c.count}</span></p>
                      <p>Avg Temperature: <span className="text-gaas-text font-semibold">{c.avgTemp}°C</span></p>
                      <p>Avg Humidity: <span className="text-gaas-text font-semibold">{c.avgHumidity}%</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
