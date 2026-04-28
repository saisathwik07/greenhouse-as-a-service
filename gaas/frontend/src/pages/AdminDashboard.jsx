import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_SESSION_HELP, ensureAppJwtFromGoogleIdToken, getAuthToken } from "../api";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const hasToken = await ensureAppJwtFromGoogleIdToken();
        if (!hasToken && !getAuthToken()) {
          if (!active) return;
          setError(`Authentication required — no API JWT. ${API_SESSION_HELP}`);
          setLoading(false);
          return;
        }

        const fetchAll = () =>
          Promise.all([
            api.get("/admin/users"),
            api.get("/admin/payments"),
            api.get("/admin/subscriptions"),
          ]);

        let u;
        let p;
        let s;
        try {
          [u, p, s] = await fetchAll();
        } catch (firstErr) {
          if (firstErr?.response?.status === 401) {
            await ensureAppJwtFromGoogleIdToken();
            [u, p, s] = await fetchAll();
          } else {
            throw firstErr;
          }
        }

        if (!active) return;
        setUsers(Array.isArray(u.data?.users) ? u.data.users : []);
        setPayments(Array.isArray(p.data?.payments) ? p.data.payments : []);
        setSubscriptions(Array.isArray(s.data?.subscriptions) ? s.data.subscriptions : []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err?.message || "Failed to load admin dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-end justify-between gap-4 border-b border-gaas-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gaas-accent">Administration</p>
          <h1 className="text-2xl font-bold text-gaas-heading">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Link to="/admin/support" className="btn-primary text-sm">
            Support tickets
          </Link>
          <Link to="/home" className="btn-secondary text-sm">
            ← Back to app
          </Link>
        </div>
      </div>

      {loading && <div className="glass-card p-8 text-center text-gaas-muted">Loading...</div>}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">All Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gaas-border">
                    <th className="text-left py-2 pr-3">Name</th>
                    <th className="text-left py-2 pr-3">Email</th>
                    <th className="text-left py-2 pr-3">Wallet</th>
                    <th className="text-left py-2 pr-3">Active Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id || u.email} className="border-b border-gaas-border/50">
                      <td className="py-2 pr-3">{u.name}</td>
                      <td className="py-2 pr-3">{u.email}</td>
                      <td className="py-2 pr-3">₹{Number(u.walletBalance || 0).toFixed(2)}</td>
                      <td className="py-2 pr-3">{u.plan || "none"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">All Payments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gaas-border">
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id || p.paymentId} className="border-b border-gaas-border/50">
                      <td className="py-2 pr-3">{p.userName || p.userEmail}</td>
                      <td className="py-2 pr-3">₹{((Number(p.amount) || 0) / 100).toFixed(2)}</td>
                      <td className="py-2 pr-3 capitalize">{p.status}</td>
                      <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">All Subscriptions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gaas-border">
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Plan</th>
                    <th className="text-left py-2 pr-3">Start</th>
                    <th className="text-left py-2 pr-3">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id || `${s.userEmail}-${s.orderId}`} className="border-b border-gaas-border/50">
                      <td className="py-2 pr-3">{s.userName || s.userEmail}</td>
                      <td className="py-2 pr-3">{s.planName || "-"}</td>
                      <td className="py-2 pr-3">{formatDate(s.startDate)}</td>
                      <td className="py-2 pr-3">{formatDate(s.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
