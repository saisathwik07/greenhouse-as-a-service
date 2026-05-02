import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useSubscription } from "../hooks/useSubscription";

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

/**
 * Reached after a successful Razorpay verify. The wizard navigates here with
 * `state.subscription` and `state.paymentId`. If a user opens the URL
 * directly we fall back to fetching the latest invoice via /api/billing.
 */
export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshSubscription } = useSubscription();

  const initial = location.state?.subscription || null;
  const [sub, setSub] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");

  const paymentId = location.state?.paymentId || params.get("paymentId") || sub?.paymentId;
  const invoiceId = params.get("ref") || sub?.id;

  useEffect(() => {
    refreshSubscription().catch(() => {});
  }, [refreshSubscription]);

  useEffect(() => {
    if (sub) return;
    let active = true;
    (async () => {
      try {
        if (invoiceId) {
          const { data } = await api.get(`/billing/invoice/${invoiceId}`);
          if (!active) return;
          setSub(data.invoice);
        } else {
          const { data } = await api.get("/billing");
          if (!active) return;
          setSub(data.activeSubscription || data.invoices?.[0] || null);
        }
      } catch (err) {
        if (!active) return;
        setError(
          err?.response?.data?.error || err.message || "Could not load receipt"
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [invoiceId, sub]);

  const items = useMemo(() => {
    const services = sub?.selectedServices || [];
    const addons = sub?.addons || [];
    return [
      ...services.map((s) =>
        typeof s === "string"
          ? { id: s, label: s, price: null, kind: "service" }
          : { ...s, kind: "service" }
      ),
      ...addons.map((a) =>
        typeof a === "string"
          ? { id: a, label: a, price: null, kind: "addon" }
          : { ...a, kind: "addon" }
      ),
    ];
  }, [sub]);

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="glass-card p-7 border-emerald-300 bg-emerald-50/40">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold shrink-0">
            ✓
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">
              Payment successful
            </h1>
            <p className="text-sm text-emerald-900/80 mt-1">
              Your subscription is active. A receipt is available in your
              billing history.
            </p>
          </div>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-gaas-muted">Loading receipt...</p>
        )}

        {error && (
          <p className="mt-6 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            {error}
          </p>
        )}

        {sub && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gaas-muted">
                  Plan
                </p>
                <p className="font-semibold text-gaas-heading">
                  {sub.planLabel || sub.planName}{" "}
                  <span className="text-gaas-muted font-normal">
                    • {sub.durationLabel || sub.duration}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gaas-muted">
                  Amount paid
                </p>
                <p className="font-semibold text-gaas-heading">
                  {formatINR(sub.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gaas-muted">
                  Active from
                </p>
                <p className="font-semibold text-gaas-heading">
                  {formatDate(sub.startDate)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gaas-muted">
                  Expires on
                </p>
                <p className="font-semibold text-gaas-heading">
                  {formatDate(sub.expiryDate)}
                </p>
              </div>
            </div>

            {paymentId && (
              <div className="text-xs text-gaas-muted font-mono break-all">
                Razorpay payment ID: {paymentId}
              </div>
            )}

            {items.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 p-3">
                <p className="text-xs uppercase tracking-wide text-gaas-muted mb-2">
                  Unlocked
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span
                      key={item.id}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/", { replace: true })}
          >
            Go to Dashboard
          </button>
          <Link to="/billing" className="btn-secondary">
            View invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
