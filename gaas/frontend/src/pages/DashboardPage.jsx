import { useEffect, useState } from "react";
import SensorCard from "../components/SensorCard";
import HealthIndicator from "../components/HealthIndicator";
import AlertBanner from "../components/AlertBanner";
import RowGrid from "../components/RowGrid";
import PlantDetailModal from "../components/PlantDetailModal";
import { useSensors, useRows, useBags } from "../hooks/useSensors";
import { useSubscription } from "../hooks/useSubscription";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api, API_SESSION_HELP, ensureAppJwtFromGoogleIdToken, getAuthToken } from "../api";
import { formatPlanDisplayName, isPaidPremiumPlan } from "../lib/planDisplay";

export default function DashboardPage() {
  const { isGuest } = useAuth();
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
          setHistoryError(`Could not load purchase history — no valid API token. ${API_SESSION_HELP}`);
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

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <h1 className="text-2xl font-bold text-gaas-heading">Overview</h1>
          <Link to="/help" className="btn-primary text-sm shrink-0">
            Help
          </Link>
        </div>
        <p className="text-sm text-gaas-muted mt-1">Realtime sensors, alerts, and greenhouse structure</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center text-gaas-danger text-sm font-medium">{error === "Network Error" ? "Network Error" : error}</div>
      )}

      {/* Realtime Sensors */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">Subscription</h2>
        {isGuest ? (
          <p className="text-sm text-gaas-text">
            Guest mode — dashboard overview only. Sign in with Google or email to get the free Basic tier (live data and downloads). Crop and yield tools unlock on Standard or Premium.
          </p>
        ) : (
          <>
            <p className="text-sm text-gaas-text">
              Current plan:{" "}
              <span className="font-semibold text-gaas-accent">
                {formatPlanDisplayName(plan)}
              </span>
            </p>
            <p className="text-xs text-gaas-muted mt-1">
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

      <div className="glass-card p-5">
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
          Purchase History
        </h2>
        {isGuest ? (
          <p className="text-sm text-gaas-muted">Sign in to see purchase history.</p>
        ) : historyLoading ? (
          <p className="text-sm text-gaas-muted">Loading purchases...</p>
        ) : historyError ? (
          <p className="text-sm text-red-600">{historyError}</p>
        ) : paymentHistory.length === 0 ? (
          <p className="text-sm text-gaas-muted">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gaas-border">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Plan</th>
                  <th className="text-left py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.slice(0, 8).map((p) => (
                  <tr key={p.id || p.paymentId} className="border-b border-gaas-border/50">
                    <td className="py-2 pr-3">{new Date(p.paymentDate).toLocaleString()}</td>
                    <td className="py-2 pr-3">{p.planName || "-"}</td>
                    <td className="py-2 pr-3">₹{((Number(p.amount) || 0) / 100).toFixed(2)}</td>
                    <td className="py-2 pr-3 capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Realtime Sensors */}
      <div className="glass-card p-6">
        <h2 className="text-center text-sm font-semibold text-gaas-heading mb-4">Realtime sensors</h2>
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

      {/* Health Score */}
      <div className="glass-card p-5">
        <HealthIndicator score={realtime?.healthScore} />
      </div>

      {/* Alerts */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">Alerts</h2>
        <AlertBanner alerts={alerts} />
        {lastUpdated && (
          <p className="text-xs text-gaas-muted mt-3">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Greenhouse Overview — Drill-down Level 1 */}
      <div>
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">Greenhouse Structure</h2>
        {rowsLoading ? (
          <div className="glass-card p-8 text-center text-gaas-muted">Loading rows...</div>
        ) : (
          <RowGrid rows={rows} onSelectRow={setSelectedRow} />
        )}
      </div>

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
