import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

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

function StatusBadge({ status }) {
  const map = {
    success: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-600",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase ${cls}`}>
      {status || "unknown"}
    </span>
  );
}

function downloadInvoiceHtml(inv) {
  const lines = [
    `<h1 style="font-family:sans-serif;margin:0">Invoice ${inv.invoiceNumber}</h1>`,
    `<p style="font-family:sans-serif;color:#6b7280">Date: ${new Date(
      inv.startDate || inv.createdAt
    ).toLocaleString()}</p>`,
    `<p style="font-family:sans-serif"><b>Plan:</b> ${inv.planLabel} (${inv.userTypeLabel}) — ${inv.durationLabel}</p>`,
    `<p style="font-family:sans-serif"><b>Status:</b> ${inv.paymentStatus}</p>`,
    `<p style="font-family:sans-serif"><b>Razorpay Payment ID:</b> ${inv.paymentId || "—"}</p>`,
    `<p style="font-family:sans-serif"><b>Razorpay Order ID:</b> ${inv.orderId}</p>`,
    `<table style="font-family:sans-serif;border-collapse:collapse;margin-top:12px"><thead><tr><th style="text-align:left;padding:6px 12px;border-bottom:1px solid #e5e7eb">Item</th><th style="text-align:right;padding:6px 12px;border-bottom:1px solid #e5e7eb">Amount /mo</th></tr></thead><tbody>`,
    ...inv.selectedServices.map(
      (s) =>
        `<tr><td style="padding:6px 12px">${s.label}</td><td style="text-align:right;padding:6px 12px">${
          s.price ? formatINR(s.price) : "Included"
        }</td></tr>`
    ),
    ...inv.addons.map(
      (a) =>
        `<tr><td style="padding:6px 12px">${a.label}</td><td style="text-align:right;padding:6px 12px">${formatINR(
          a.price
        )}</td></tr>`
    ),
    `</tbody></table>`,
    `<p style="font-family:sans-serif;text-align:right;font-size:18px;margin-top:18px"><b>Total: ${formatINR(
      inv.totalAmount
    )}</b> (incl. GST)</p>`,
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.invoiceNumber}</title></head><body style="padding:24px">${lines.join("")}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoiceNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/billing");
        if (!active) return;
        setData(data);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(
          err?.response?.data?.error || err.message || "Failed to load billing"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const active = data?.activeSubscription;
  const invoices = data?.invoices || [];
  const summary = data?.summary || { invoicesCount: 0, totalPaid: 0 };

  const daysLeft = useMemo(() => {
    if (!active?.expiryDate) return null;
    const ms = new Date(active.expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }, [active]);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-in">
        <p className="text-sm text-gaas-muted">Loading billing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 animate-in">
        <h1 className="text-xl font-bold text-gaas-heading">Billing</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gaas-heading">Billing & Invoices</h1>
            <p className="text-sm text-gaas-muted mt-1">
              View your subscription, transaction history and download invoices
            </p>
          </div>
          <Link to="/subscription" className="btn-primary">
            Manage subscription
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Active subscription
          </p>
          {active ? (
            <>
              <p className="text-lg font-bold text-gaas-heading mt-1">
                {active.planLabel}{" "}
                <span className="text-sm font-medium text-gaas-muted">
                  • {active.durationLabel}
                </span>
              </p>
              <p className="text-xs text-gaas-muted mt-1">
                {active.userTypeLabel}
              </p>
              <p className="text-sm font-semibold text-gaas-accent mt-3">
                {formatINR(active.totalAmount)} paid
              </p>
              <p className="text-xs text-gaas-muted mt-1">
                Expires {formatDate(active.expiryDate)}
                {daysLeft != null && (
                  <span className="ml-1">({daysLeft} days left)</span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-gaas-heading mt-1">
                No active plan
              </p>
              <Link
                to="/subscription"
                className="text-sm text-gaas-accent font-semibold mt-3 inline-block"
              >
                Browse plans →
              </Link>
            </>
          )}
        </div>

        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Lifetime spend
          </p>
          <p className="text-3xl font-extrabold text-gaas-heading mt-2">
            {formatINR(summary.totalPaid)}
          </p>
          <p className="text-xs text-gaas-muted mt-1">
            Across {summary.invoicesCount} invoice
            {summary.invoicesCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Razorpay transactions
          </p>
          <p className="text-3xl font-extrabold text-gaas-heading mt-2">
            {data?.transactions?.length || 0}
          </p>
          <p className="text-xs text-gaas-muted mt-1">
            All payments are verified via HMAC signature
          </p>
        </div>
      </div>

      <div className="glass-card p-5 overflow-x-auto">
        <h2 className="text-sm font-bold text-gaas-heading uppercase tracking-wider mb-3">
          Invoice history
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-gaas-muted">No invoices yet.</p>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gaas-muted">
                <th className="p-2">Invoice</th>
                <th className="p-2">Date</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Cycle</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gaas-border">
                  <td className="p-2 font-mono text-xs text-gaas-text">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-2">{formatDate(inv.startDate || inv.createdAt)}</td>
                  <td className="p-2">
                    <span className="font-medium text-gaas-heading">{inv.planLabel}</span>
                    <span className="text-xs text-gaas-muted ml-1">
                      ({inv.userTypeLabel})
                    </span>
                  </td>
                  <td className="p-2">{inv.durationLabel}</td>
                  <td className="p-2 text-right font-semibold">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="p-2">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-gaas-accent font-semibold hover:underline"
                      onClick={() => downloadInvoiceHtml(inv)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
