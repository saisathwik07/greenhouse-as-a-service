import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  API_SESSION_HELP,
  ensureAppJwtFromGoogleIdToken,
  getAuthToken,
} from "../api";
import ActivityFeed from "../components/admin/ActivityFeed";
import UserDrawer from "../components/admin/UserDrawer";
import { useAuth } from "../hooks/useAuth";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "analytics", label: "Analytics" },
  { id: "churn", label: "Churn & Retention" },
];

const PLAN_COLORS = ["#16A34A", "#6366F1", "#F59E0B", "#0EA5E9"];
const ROLE_COLORS = ["#22C55E", "#8B5CF6", "#F97316", "#0EA5E9"];

const TONE_STYLES = {
  positive: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  info: "bg-sky-50 border-sky-200 text-sky-900",
};

function formatINR(value, options = {}) {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    ...options,
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

function StatCard({ label, value, sub, accent = "text-gaas-heading", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-5"
    >
      <p className="text-xs uppercase tracking-wide text-gaas-muted">{label}</p>
      <p className={`text-3xl font-extrabold mt-2 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gaas-muted mt-1">{sub}</p>}
    </motion.div>
  );
}

function InsightsPanel({ items }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
        AI insights
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gaas-muted">No insights yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((insight, idx) => (
            <motion.li
              key={`${insight.title}-${idx}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * idx, duration: 0.25 }}
              className={`rounded-lg border px-3 py-2 ${
                TONE_STYLES[insight.tone] || TONE_STYLES.info
              }`}
            >
              <p className="text-xs font-bold">{insight.title}</p>
              <p className="text-[11px] mt-0.5 opacity-80">{insight.body}</p>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FunnelView({ funnel }) {
  if (!funnel) return null;
  const max = Math.max(...funnel.stages.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {funnel.stages.map((s, idx) => {
        const widthPct = Math.max(8, (s.count / max) * 100);
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scaleX: 0.6, originX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: idx * 0.07, duration: 0.45 }}
            className="rounded-lg bg-white border border-gaas-border overflow-hidden"
          >
            <div className="flex items-center">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white text-xs font-semibold px-3 py-2"
                style={{ width: `${widthPct}%` }}
              >
                {s.label} · {s.count}
              </div>
              <div className="px-3 text-xs text-gaas-muted whitespace-nowrap">
                {s.conversionFromPrev}% step · {s.conversionFromTop}% of all users
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const VALID_TABS = new Set(["overview", "users", "analytics", "churn"]);

export default function AdminDashboard() {
  const { user: currentAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return VALID_TABS.has(t) ? t : "overview";
  })();
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    if (VALID_TABS.has(t) && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const switchTab = (next) => {
    setTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === "overview") {
      sp.delete("tab");
    } else {
      sp.set("tab", next);
    }
    setSearchParams(sp, { replace: true });
  };
  const [users, setUsers] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [features, setFeatures] = useState(null);
  const [churn, setChurn] = useState(null);
  const [roleRev, setRoleRev] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const hasToken = await ensureAppJwtFromGoogleIdToken();
        if (!hasToken && !getAuthToken()) {
          if (!active) return;
          setError(`Authentication required. ${API_SESSION_HELP}`);
          setLoading(false);
          return;
        }

        const fetchAll = () =>
          Promise.all([
            api.get("/admin/users?limit=100"),
            api.get("/admin/analytics/revenue"),
            api.get("/admin/analytics/funnel"),
            api.get("/admin/analytics/downloads"),
            api.get("/admin/analytics/features"),
            api.get("/admin/analytics/churn"),
            api.get("/admin/analytics/role-revenue"),
            api.get("/admin/insights"),
          ]);

        let res;
        try {
          res = await fetchAll();
        } catch (firstErr) {
          if (firstErr?.response?.status === 401) {
            await ensureAppJwtFromGoogleIdToken();
            res = await fetchAll();
          } else {
            throw firstErr;
          }
        }

        if (!active) return;
        setUsers(Array.isArray(res[0].data?.users) ? res[0].data.users : []);
        setRevenue(res[1].data);
        setFunnel(res[2].data);
        setDownloads(res[3].data);
        setFeatures(res[4].data);
        setChurn(res[5].data);
        setRoleRev(res[6].data);
        setInsights(res[7].data?.insights || []);
      } catch (err) {
        if (!active) return;
        setError(
          err?.response?.data?.error || err.message || "Failed to load dashboard"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshUsers = async () => {
    try {
      const { data } = await api.get("/admin/users?limit=100");
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      console.warn("[admin] refreshUsers failed:", err.message);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.plan || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-gaas-muted animate-in">
        Loading intelligence dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 animate-in">
        <h1 className="text-xl font-bold text-gaas-heading">Admin</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const totals = revenue?.totals || {};

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 animate-in">
      <div className="space-y-5 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-card p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">
                Intelligence
              </p>
              <h1 className="text-2xl font-bold text-gaas-heading">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gaas-muted mt-0.5">
                Real-time SaaS metrics across users, revenue, and feature usage
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Link to="/admin/analytics" className="btn-secondary text-sm">
                Revenue (legacy)
              </Link>
              <Link to="/admin/support" className="btn-secondary text-sm">
                Support tickets
              </Link>
              <Link to="/" className="btn-secondary text-sm">
                ← Back to app
              </Link>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? "bg-gaas-accent text-white"
                      : "bg-white text-gaas-muted hover:text-gaas-heading border border-gaas-border"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total revenue"
            value={formatINR(totals.totalRevenue)}
            sub={`${totals.paidInvoices || 0} paid invoices`}
            accent="text-gaas-accent"
            delay={0.0}
          />
          <StatCard
            label="MRR"
            value={formatINR(revenue?.mrr)}
            sub={`ARR ≈ ${formatINR(revenue?.arr)}`}
            delay={0.05}
          />
          <StatCard
            label="Active subs"
            value={String(totals.activeSubscriptions || 0)}
            sub={`${totals.totalUsers || 0} total users`}
            delay={0.1}
          />
          <StatCard
            label="Churn (30d)"
            value={`${churn?.churnRate30d ?? 0}%`}
            sub={`${churn?.churned30d ?? 0} churned`}
            accent={
              (churn?.churnRate30d ?? 0) > 8 ? "text-red-600" : "text-gaas-heading"
            }
            delay={0.15}
          />
        </div>

        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-card p-4 lg:col-span-2">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Revenue trend (12 months)
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenue?.byMonth || []}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16A34A" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#6B7280" fontSize={11} />
                      <YAxis stroke="#6B7280" fontSize={11} />
                      <Tooltip formatter={(v) => formatINR(v)} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#16A34A"
                        strokeWidth={2}
                        fill="url(#revGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Revenue by plan
                  </h3>
                  {revenue?.byPlan?.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={revenue.byPlan}
                          dataKey="revenue"
                          nameKey="label"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {revenue.byPlan.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PLAN_COLORS[idx % PLAN_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatINR(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-gaas-muted">No plan revenue yet.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Revenue by user role
                  </h3>
                  {roleRev?.byRole?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={roleRev.byRole} barCategoryGap={20}>
                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#6B7280" fontSize={11} />
                        <YAxis stroke="#6B7280" fontSize={11} />
                        <Tooltip formatter={(v) => formatINR(v)} />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {roleRev.byRole.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={ROLE_COLORS[idx % ROLE_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-gaas-muted">
                      No role-segmented revenue yet.
                    </p>
                  )}
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Conversion funnel
                  </h3>
                  <FunnelView funnel={funnel} />
                </div>
              </div>
            </motion.div>
          )}

          {tab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="glass-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider">
                  All users · click a row for analytics
                </h3>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, plan..."
                  className="text-sm border border-gaas-border rounded-lg px-3 py-1.5 w-60"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gaas-muted border-b border-gaas-border">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Joined</th>
                      <th className="py-2 pr-3">Last login</th>
                      <th className="py-2 pr-3 text-right">Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id || u.email}
                        onClick={() => setActiveUserId(u.id)}
                        className="border-b border-gaas-border/50 hover:bg-gaas-accent/5 cursor-pointer transition"
                      >
                        <td className="py-2 pr-3 font-medium text-gaas-heading">
                          <span className="inline-flex items-center gap-2">
                            {u.name}
                            {u.isBlocked && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold uppercase">
                                Blocked
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gaas-muted">{u.email}</td>
                        <td className="py-2 pr-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                            {u.plan || "free"}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{formatDate(u.createdAt)}</td>
                        <td className="py-2 pr-3">{formatDate(u.lastLoginAt)}</td>
                        <td className="py-2 pr-3 text-right">
                          ₹{Number(u.walletBalance || 0).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-gaas-muted text-center py-6">
                    No users match your search.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {tab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Dataset downloads (30 days)
                  </h3>
                  {downloads?.trend?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={downloads.trend}>
                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#6B7280" fontSize={10} interval={3} />
                        <YAxis stroke="#6B7280" fontSize={11} allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-gaas-muted">No downloads yet.</p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {(downloads?.byKind || []).map((row) => (
                      <div
                        key={row.kind}
                        className="rounded-lg bg-white border border-gaas-border px-3 py-1.5 flex justify-between"
                      >
                        <span className="text-gaas-muted">{row.kind}</span>
                        <span className="font-bold text-gaas-heading">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Feature adoption
                  </h3>
                  {features?.items?.length ? (
                    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {features.items.map((f) => {
                        const adoption = Math.min(100, f.adoption);
                        return (
                          <li key={f.id} className="text-xs">
                            <div className="flex justify-between">
                              <span className="font-semibold text-gaas-heading">
                                {f.label}
                              </span>
                              <span className="text-gaas-muted">
                                {f.callingUsers}/{f.ownedBy} users · {f.callsAllTime} calls
                              </span>
                            </div>
                            <div className="h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${adoption}%` }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-gaas-accent"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-gaas-muted">
                      No feature usage data yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="glass-card p-4">
                <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                  Top downloaders
                </h3>
                {downloads?.topUsers?.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gaas-muted">
                        <th className="py-1 pr-3">User</th>
                        <th className="py-1 pr-3">Email</th>
                        <th className="py-1 pr-3 text-right">Downloads</th>
                        <th className="py-1 pr-3">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloads.topUsers.map((u) => (
                        <tr
                          key={u.userId || u.email}
                          onClick={() => u.userId && setActiveUserId(u.userId)}
                          className="border-t border-gaas-border/60 cursor-pointer hover:bg-gaas-accent/5"
                        >
                          <td className="py-1 pr-3 font-medium">{u.name}</td>
                          <td className="py-1 pr-3 text-gaas-muted">{u.email}</td>
                          <td className="py-1 pr-3 text-right font-bold">
                            {u.count}
                          </td>
                          <td className="py-1 pr-3 text-xs">
                            {formatDate(u.lastDownloadAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gaas-muted">
                    No downloads tracked yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {tab === "churn" && (
            <motion.div
              key="churn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    Cohort retention
                  </h3>
                  {churn?.cohortByMonth?.length ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={churn.cohortByMonth} barCategoryGap={6}>
                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#6B7280" fontSize={11} />
                        <YAxis stroke="#6B7280" fontSize={11} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="retained"
                          stackId="a"
                          fill="#16A34A"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="churned"
                          stackId="a"
                          fill="#EF4444"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-gaas-muted">No cohort data yet.</p>
                  )}
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
                    At-risk subscriptions (≤7 days)
                  </h3>
                  {churn?.atRisk?.length ? (
                    <ul className="text-sm space-y-2">
                      {churn.atRisk.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 border-b border-gaas-border/60 pb-2"
                        >
                          <div>
                            <p className="font-medium text-gaas-heading">
                              {row.userName}
                            </p>
                            <p className="text-xs text-gaas-muted">
                              {row.userEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gaas-muted capitalize">
                              {row.planName}
                            </p>
                            <p
                              className={`text-xs font-bold ${
                                row.daysLeft <= 2
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {row.daysLeft} day{row.daysLeft === 1 ? "" : "s"} left
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gaas-muted">
                      No subscriptions are expiring this week.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 self-start">
        <InsightsPanel items={insights} />
        <ActivityFeed />
      </aside>

      <UserDrawer
        userId={activeUserId}
        onClose={() => setActiveUserId(null)}
        onUserChanged={refreshUsers}
        currentAdminId={currentAdmin?.uid || currentAdmin?.id || null}
      />
    </div>
  );
}
