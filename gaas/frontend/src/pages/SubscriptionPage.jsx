import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api, getAuthToken } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

const DURATION_OPTIONS = [
  { key: "monthly", label: "Monthly", save: "" },
  { key: "quarterly", label: "Quarterly", save: "Save 10%" },
  { key: "yearly", label: "Yearly", save: "Save 20%" },
];

const PRICING = {
  basic: { monthly: 0, quarterly: 0, yearly: 0 },
  standard: { monthly: 249, quarterly: 672, yearly: 2390 },
  premium: { monthly: 499, quarterly: 1347, yearly: 4790 },
};

const FEATURES = [
  { label: "View Live Data (24hr)", basic: true, standard: true, premium: true },
  { label: "Crop Recommendation", basic: false, standard: true, premium: true },
  { label: "Yield Prediction", basic: false, standard: true, premium: true },
  { label: "Download Recent Data", basic: true, standard: true, premium: true },
  { label: "Pest & Disease AI", basic: false, standard: true, premium: true },
  { label: "Greenhouse Simulation", basic: false, standard: true, premium: true },
  { label: "MQTT / Real-time IoT Dashboard", basic: false, standard: false, premium: true },
  { label: "Unlimited Downloads", basic: false, standard: false, premium: true },
  { label: "Priority Support", basic: false, standard: false, premium: true },
];

const PLAN_LABELS = {
  none: "Guest",
  free: "Guest",
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
  pro: "Premium",
};

const PLAN_RANK = {
  none: 0,
  free: 1,
  basic: 1,
  standard: 2,
  premium: 3,
  pro: 3,
};

const API_PLAN_NAME = {
  basic: "Basic",
  standard: "Pro",
  premium: "Premium",
};

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(value) {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function extractUserId(user) {
  if (user?.id) return user.id;
  const appJwt = getAuthToken();
  if (appJwt) {
    try {
      const decoded = jwtDecode(appJwt);
      if (decoded?.id) return decoded.id;
      if (decoded?.sub) return decoded.sub;
    } catch {
      // ignore and try fallbacks
    }
  }
  if (user?.uid?.startsWith("google:")) return user.uid.replace("google:", "");
  return null;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { plan, role, planExpiresAt, refreshSubscription } = useSubscription();
  const [duration, setDuration] = useState("monthly");
  const [error, setError] = useState("");
  const [processingPlan, setProcessingPlan] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  const expiresInDays = daysUntil(planExpiresAt);
  const expiringSoon = expiresInDays != null && expiresInDays >= 0 && expiresInDays <= 7;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await loadRazorpayScript();
      if (mounted) setScriptReady(ok);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const amountInRupees = useMemo(
    () => (planKey) => PRICING[planKey][duration],
    [duration]
  );

  const subscribe = async (planKey) => {
    setError("");
    const rupees = amountInRupees(planKey);
    if (rupees <= 0) {
      setError("Basic is free for all signed-in users — no payment needed.");
      return;
    }
    const userId = extractUserId(user);
    if (!userId) {
      setError("Unable to identify user. Please log out and sign in again with Google.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setError("Razorpay checkout is not available. Please refresh and try again.");
      return;
    }

    setProcessingPlan(planKey);
    try {
      const amountPaise = rupees * 100;
      const createRes = await api.post("/payment/create-order", {
        amount: amountPaise,
        currency: "INR",
        plan: API_PLAN_NAME[planKey],
        duration,
        userId,
      });

      const keyFromEnv = import.meta.env.VITE_RAZORPAY_KEY_ID;
      const checkoutKey = keyFromEnv || createRes.data?.key;
      if (!checkoutKey) {
        throw new Error("Missing Razorpay key. Set VITE_RAZORPAY_KEY_ID in .env.local.");
      }

      const options = {
        key: checkoutKey,
        amount: createRes.data.amount,
        currency: createRes.data.currency || "INR",
        name: "GAAS",
        description: `${PLAN_LABELS[planKey]} plan (${duration})`,
        order_id: createRes.data.orderId,
        handler: async (response) => {
          try {
            await api.post("/payment/verify", {
              ...response,
              userId,
              plan: API_PLAN_NAME[planKey],
              duration,
              planId: createRes.data?.planId,
              amount: amountPaise,
            });
            await refreshSubscription();
          } catch (verifyErr) {
            console.error("Payment verification failed", verifyErr);
            setError(
              verifyErr?.response?.data?.error ||
                "Payment succeeded but verification failed. Contact support."
            );
          } finally {
            setProcessingPlan("");
          }
        },
        prefill: {
          name: user?.displayName || user?.name || "",
          email: user?.email || "",
        },
        theme: { color: "#16A34A" },
        modal: {
          ondismiss: () => {
            setProcessingPlan("");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Subscribe failed", err);
      setError(err?.response?.data?.error || err.message || "Could not start payment.");
      setProcessingPlan("");
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gaas-heading">Subscription Plans</h1>
            <p className="text-sm text-gaas-muted mt-1">
              Current plan:{" "}
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gaas-accent/15 text-gaas-accent">
                {PLAN_LABELS[plan] || "Guest"}
              </span>
            </p>
            <p className="text-sm text-gaas-muted mt-1">
              Renews on {formatDate(planExpiresAt)}
              {expiringSoon && (
                <span className="ml-2 inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                  Expiring soon — Renew now
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2 bg-gaas-bg p-1 rounded-lg">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDuration(opt.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  duration === opt.key
                    ? "bg-gaas-accent text-white"
                    : "text-gaas-muted hover:text-gaas-heading"
                }`}
              >
                {opt.label}
                {opt.save ? (
                  <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {opt.save}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left p-3 text-xs uppercase tracking-wide text-gaas-muted border-b border-gaas-border">
                Feature
              </th>
              {["basic", "standard", "premium"].map((planKey) => {
                const currentRank = PLAN_RANK[plan] ?? 0;
                const targetRank = PLAN_RANK[planKey] || 0;
                const isCurrent =
                  (plan === planKey && plan !== "none" && plan !== "guest") ||
                  (plan === "free" && planKey === "basic") ||
                  (plan === "pro" && planKey === "premium");
                const isLowerThanCurrent = currentRank > 0 && targetRank < currentRank;
                const basicFree = planKey === "basic" && amountInRupees(planKey) === 0;
                const disabled =
                  basicFree || isCurrent || isLowerThanCurrent || processingPlan === planKey;
                const isPopular = planKey === "standard";
                const isPremium = planKey === "premium";
                return (
                  <th
                    key={planKey}
                    className={`p-3 text-center border-b border-gaas-border ${
                      isPremium ? "bg-gaas-accent/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base font-semibold text-gaas-heading">
                        {PLAN_LABELS[planKey]}
                      </span>
                      {isPopular && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-gaas-heading mt-1">
                      {basicFree ? (
                        <span>Free</span>
                      ) : (
                        <>
                          ₹{amountInRupees(planKey)}
                          <span className="text-xs font-medium text-gaas-muted"> / {duration}</span>
                        </>
                      )}
                    </p>
                    <button
                      type="button"
                      className={`mt-3 px-3 py-1.5 rounded-md text-sm font-semibold ${
                        disabled
                          ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                          : isPremium
                          ? "bg-gaas-accent text-white"
                          : "btn-primary"
                      }`}
                      disabled={disabled}
                      onClick={() => subscribe(planKey)}
                    >
                      {basicFree
                        ? isCurrent
                          ? "Current plan"
                          : "Included"
                        : isCurrent
                        ? "Current Plan"
                        : isLowerThanCurrent
                        ? "Lower Plan Disabled"
                        : processingPlan === planKey
                        ? "Processing..."
                        : "Subscribe"}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.label}>
                <td className="p-3 text-sm text-gaas-heading border-b border-gaas-border">{feature.label}</td>
                <td className="p-3 text-center border-b border-gaas-border">
                  <span className={feature.basic ? "text-emerald-600" : "text-red-500"}>
                    {feature.basic ? "✅" : "❌"}
                  </span>
                </td>
                <td className="p-3 text-center border-b border-gaas-border">
                  <span className={feature.standard ? "text-emerald-600" : "text-red-500"}>
                    {feature.standard ? "✅" : "❌"}
                  </span>
                </td>
                <td className="p-3 text-center border-b border-gaas-border bg-gaas-accent/5">
                  <span className={feature.premium ? "text-emerald-600" : "text-red-500"}>
                    {feature.premium ? "✅" : "❌"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
