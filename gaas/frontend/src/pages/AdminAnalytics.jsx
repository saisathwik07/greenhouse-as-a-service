import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ArcElement } from "chart.js";
import { Chart as ChartJS } from "chart.js";
import { api, ensureAppJwtFromGoogleIdToken, getAuthToken } from "../api";

ChartJS.register(ArcElement);

function formatINR(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PLAN_COLORS = ["#16A34A", "#6366F1", "#F59E0B", "#0EA5E9"];
const USER_TYPE_COLORS = ["#22C55E", "#8B5CF6", "#F97316"];

function StatCard({ label, value, sub, accent = "text-gaas-heading" }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wide text-gaas-muted">{label}</p>
      <p className={`text-3xl font-extrabold mt-2 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gaas-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const hasToken = await ensureAppJwtFromGoogleIdToken();
        if (!hasToken && !getAuthToken()) {
          setError("Authentication required.");
          return;
        }
        const { data } = await api.get("/admin/analytics/revenue");
        if (!active) return;
        setData(data);
      } catch (err) {
        if (!active) return;
        setError(
          err?.response?.data?.error || err.message || "Failed to load analytics"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const monthlyTrend = useMemo(() => {
    if (!data?.byMonth) return null;
    return {
      labels: data.byMonth.map((row) => row.label),
      datasets: [
        {
          label: "Revenue",
          data: data.byMonth.map((row) => row.revenue),
          borderColor: "#16A34A",
          backgroundColor: "rgba(22,163,74,0.15)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [data]);

  const planBreakdown = useMemo(() => {
    if (!data?.byPlan) return null;
    return {
      labels: data.byPlan.map((row) => row.label),
      datasets: [
        {
          label: "Revenue",
          data: data.byPlan.map((row) => row.revenue),
          backgroundColor: data.byPlan.map(
            (_, idx) => PLAN_COLORS[idx % PLAN_COLORS.length]
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  const userTypeBreakdown = useMemo(() => {
    if (!data?.byUserType) return null;
    return {
      labels: data.byUserType.map((row) => row.label),
      datasets: [
        {
          label: "Revenue",
          data: data.byUserType.map((row) => row.revenue),
          backgroundColor: data.byUserType.map(
            (_, idx) => USER_TYPE_COLORS[idx % USER_TYPE_COLORS.length]
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-in">
        <p className="text-sm text-gaas-muted">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 animate-in">
        <h1 className="text-xl font-bold text-gaas-heading">Revenue Analytics</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link to="/admin" className="text-sm text-gaas-accent font-semibold mt-3 inline-block">
          Back to admin →
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5 animate-in">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gaas-heading">Revenue Analytics</h1>
            <p className="text-sm text-gaas-muted mt-1">
              As of {new Date(data.asOf).toLocaleString()} • all amounts in INR (incl. GST)
            </p>
          </div>
          <Link to="/admin" className="btn-secondary">
            ← Admin home
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total revenue"
          value={formatINR(data.totals.totalRevenue)}
          sub={`${data.totals.paidInvoices} paid invoices`}
          accent="text-gaas-accent"
        />
        <StatCard
          label="MRR"
          value={formatINR(data.mrr)}
          sub={`ARR ≈ ${formatINR(data.arr)}`}
        />
        <StatCard
          label="Active subscriptions"
          value={String(data.totals.activeSubscriptions)}
          sub={`of ${data.totals.totalUsers} total users`}
        />
        <StatCard
          label="Avg. invoice"
          value={formatINR(
            data.totals.paidInvoices
              ? data.totals.totalRevenue / data.totals.paidInvoices
              : 0
          )}
          sub="Average paid amount"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
            Revenue trend (last 12 months)
          </h2>
          {monthlyTrend ? (
            <Line
              data={monthlyTrend}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
              height={120}
            />
          ) : (
            <p className="text-sm text-gaas-muted">No data yet.</p>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
            Revenue by plan
          </h2>
          {planBreakdown && data.byPlan.length > 0 ? (
            <Doughnut
              data={planBreakdown}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          ) : (
            <p className="text-sm text-gaas-muted">No paid plans yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
            Revenue by user type
          </h2>
          {userTypeBreakdown && data.byUserType.length > 0 ? (
            <Bar
              data={userTypeBreakdown}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
              height={200}
            />
          ) : (
            <p className="text-sm text-gaas-muted">No segmentation data yet.</p>
          )}
        </div>

        <div className="glass-card p-5 lg:col-span-2 overflow-x-auto">
          <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
            Recent paid invoices
          </h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-gaas-muted">No paid invoices yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gaas-muted">
                  <th className="p-2">User</th>
                  <th className="p-2">Plan</th>
                  <th className="p-2">Cycle</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-t border-gaas-border">
                    <td className="p-2">
                      <div className="font-medium text-gaas-heading">
                        {row.userName}
                      </div>
                      <div className="text-xs text-gaas-muted">{row.userEmail}</div>
                    </td>
                    <td className="p-2">{row.planLabel}</td>
                    <td className="p-2 capitalize">{row.duration}</td>
                    <td className="p-2 text-right font-semibold">
                      {formatINR(row.totalAmount)}
                    </td>
                    <td className="p-2">{formatDate(row.startDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
