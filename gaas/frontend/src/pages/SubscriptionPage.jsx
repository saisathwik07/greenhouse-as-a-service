import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

const STEPS = [
  { id: "userType", title: "Who are you?", subtitle: "Choose your account type for the best price" },
  { id: "plan", title: "Pick a plan", subtitle: "All plans can be customised below" },
  { id: "duration", title: "Billing cycle", subtitle: "Save more with longer commitments" },
  { id: "services", title: "Pick services", subtitle: "Add only what you need" },
  { id: "addons", title: "Power-ups", subtitle: "Optional add-ons for advanced workflows" },
  { id: "checkout", title: "Review & pay", subtitle: "You'll be redirected to Razorpay" },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatINR(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Mirrors backend `pricingConfig.computeQuote` for instant UI updates. */
function computeQuoteClient(config, selection) {
  if (!config) return null;
  const userType = config.userTypes.find((u) => u.id === selection.userType);
  const plan = config.plans.find((p) => p.id === selection.planName);
  const duration = config.durations.find((d) => d.id === selection.duration);
  if (!userType || !plan || !duration) return null;

  const services = config.services.filter((s) =>
    (selection.selectedServices || []).includes(s.id)
  );
  const addons = config.addons.filter((a) => (selection.addons || []).includes(a.id));

  const servicesSum = services.reduce((sum, s) => sum + s.price, 0);
  const addonsSum = addons.reduce((sum, a) => sum + a.price, 0);
  const monthlyBase = userType.baseFee + plan.baseFee;
  const monthlySubtotal = monthlyBase + servicesSum + addonsSum;
  const preTaxTotal = Math.round(monthlySubtotal * duration.multiplier * 100) / 100;
  const gstAmount = Math.round(preTaxTotal * (config.gstRate || 0.18) * 100) / 100;
  const totalAmount = Math.round((preTaxTotal + gstAmount) * 100) / 100;

  return {
    userType,
    plan,
    duration,
    services,
    addons,
    servicesSum,
    addonsSum,
    monthlyBase,
    monthlySubtotal,
    preTaxTotal,
    gstAmount,
    totalAmount,
    totalPaise: Math.round(totalAmount * 100),
  };
}

function StepHeader({ steps, activeIdx, onJump, completedThrough }) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        const isActive = idx === activeIdx;
        const isCompleted = idx < activeIdx || completedThrough >= idx;
        const reachable = idx <= completedThrough + 1;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => reachable && onJump(idx)}
            disabled={!reachable}
            className={`flex-1 min-w-[120px] flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
              isActive
                ? "bg-gaas-accent/10 border border-gaas-accent/30"
                : isCompleted
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-gray-50 border border-gaas-border text-gaas-muted"
            } ${reachable ? "" : "cursor-not-allowed opacity-60"}`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                isActive
                  ? "bg-gaas-accent text-white"
                  : isCompleted
                  ? "bg-emerald-500 text-white"
                  : "bg-white border border-gaas-border text-gaas-muted"
              }`}
            >
              {isCompleted ? "✓" : idx + 1}
            </span>
            <span className="text-xs font-semibold leading-tight">
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceCard({ active, disabled, onClick, children, className = "", popularLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left w-full rounded-xl border p-4 transition ${
        active
          ? "border-gaas-accent bg-gaas-accent/5 ring-2 ring-gaas-accent/30 shadow-glow"
          : "border-gaas-border bg-white hover:border-gaas-accent/40 hover:shadow-card"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {popularLabel && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow">
          {popularLabel}
        </span>
      )}
      {children}
    </button>
  );
}

function ToggleCard({ active, onClick, title, description, price, suffix = "/ mo" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition flex flex-col gap-2 ${
        active
          ? "border-gaas-accent bg-gaas-accent/5 ring-2 ring-gaas-accent/30"
          : "border-gaas-border bg-white hover:border-gaas-accent/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gaas-heading">{title}</p>
          {description && (
            <p className="text-xs text-gaas-muted mt-0.5">{description}</p>
          )}
        </div>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            active
              ? "bg-gaas-accent border-gaas-accent text-white"
              : "border-gaas-border bg-white"
          }`}
        >
          {active ? "✓" : ""}
        </span>
      </div>
      <p className="text-sm font-semibold text-gaas-heading">
        {price === 0 ? (
          <span className="text-emerald-600">Included</span>
        ) : (
          <>
            {formatINR(price)}
            <span className="text-xs text-gaas-muted font-medium"> {suffix}</span>
          </>
        )}
      </p>
    </button>
  );
}

/**
 * Inline institution form rendered under the user-type selector in step 0.
 * Field set is conditional on the selected user type so we capture exactly the
 * details the admin dashboard surfaces per role.
 */
function InstitutionFields({ userType, values, onChange }) {
  const labels = {
    student: {
      institution: "College / University",
      degree: "Degree / Course",
      yearOfStudy: "Year",
    },
    researcher: {
      institution: "Organization / Lab",
      researchDomain: "Research domain",
    },
    faculty: {
      institution: "Institution",
      department: "Department",
    },
  }[userType];

  if (!labels) return null;

  return (
    <div className="mt-4 rounded-xl border border-gaas-border bg-gray-50/60 p-4">
      <p className="text-xs uppercase tracking-wide text-gaas-muted">
        Tell us about your{" "}
        {userType === "faculty" ? "institution" : userType === "researcher" ? "organisation" : "studies"}
      </p>
      <p className="text-[11px] text-gaas-muted mt-0.5">
        Optional — helps tailor recommendations and appears on your account profile.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label={labels.institution}
          value={values.institution}
          onChange={(v) => onChange({ institution: v })}
          placeholder={
            userType === "student"
              ? "e.g. IIT Bombay"
              : userType === "researcher"
              ? "e.g. ICAR Crop Lab"
              : "e.g. Anna University"
          }
        />
        {userType === "student" && (
          <>
            <Field
              label={labels.degree}
              value={values.degree}
              onChange={(v) => onChange({ degree: v })}
              placeholder="e.g. B.Tech CSE"
            />
            <Field
              label={labels.yearOfStudy}
              value={values.yearOfStudy}
              onChange={(v) => onChange({ yearOfStudy: v })}
              placeholder="e.g. 3rd year"
            />
          </>
        )}
        {userType === "researcher" && (
          <Field
            label={labels.researchDomain}
            value={values.researchDomain}
            onChange={(v) => onChange({ researchDomain: v })}
            placeholder="e.g. Precision agriculture"
          />
        )}
        {userType === "faculty" && (
          <Field
            label={labels.department}
            value={values.department}
            onChange={(v) => onChange({ department: v })}
            placeholder="e.g. Agricultural Engineering"
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gaas-text">{label}</span>
      <input
        type="text"
        className="input-field w-full mt-1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={160}
      />
    </label>
  );
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    plan: currentPlan,
    planExpiresAt,
    refreshSubscription,
    selectedServices: ownedServices,
    addons: ownedAddons,
  } = useSubscription();

  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [selection, setSelection] = useState({
    userType: "",
    planName: "",
    duration: "monthly",
    selectedServices: ["data_as_a_service"],
    addons: [],
  });

  /** Type-specific institution metadata captured inline in step 0. */
  const [profileFields, setProfileFields] = useState({
    institution: "",
    degree: "",
    yearOfStudy: "",
    department: "",
    researchDomain: "",
    purposeOfUsage: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Hydrate the inline institution form from the user's existing profile.
  useEffect(() => {
    let mounted = true;
    if (!user || user.role === "guest") return undefined;
    (async () => {
      try {
        const { data } = await api.get("/user/profile");
        if (!mounted || !data) return;
        setProfileFields((prev) => ({
          institution: data.institution || prev.institution,
          degree: data.degree || prev.degree,
          yearOfStudy: data.yearOfStudy || prev.yearOfStudy,
          department: data.department || prev.department,
          researchDomain: data.researchDomain || prev.researchDomain,
          purposeOfUsage: data.purposeOfUsage || prev.purposeOfUsage,
        }));
        if (data.userType) {
          setSelection((s) => ({ ...s, userType: s.userType || data.userType }));
        }
      } catch (_err) {
        // Profile is optional context; ignore failures silently.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/payment/pricing-config");
        if (!mounted) return;
        setConfig(data);
        setSelection((prev) => ({
          ...prev,
          userType: prev.userType || data.userTypes[0]?.id || "",
          planName: prev.planName || data.plans.find((p) => p.popular)?.id || data.plans[0]?.id || "",
        }));
      } catch (err) {
        if (!mounted) return;
        setConfigError(err?.response?.data?.error || "Failed to load pricing.");
      }
    })();
    loadRazorpayScript().then((ok) => mounted && setScriptReady(ok));
    return () => {
      mounted = false;
    };
  }, []);

  const quote = useMemo(() => computeQuoteClient(config, selection), [config, selection]);

  const setUserType = (id) => {
    setSelection((s) => ({ ...s, userType: id }));
    setMaxStepReached((m) => Math.max(m, 0));
  };
  const setPlan = (id) => {
    setSelection((s) => ({ ...s, planName: id }));
    setMaxStepReached((m) => Math.max(m, 1));
  };
  const setDuration = (id) => {
    setSelection((s) => ({ ...s, duration: id }));
    setMaxStepReached((m) => Math.max(m, 2));
  };
  const toggleService = (id) =>
    setSelection((s) => ({
      ...s,
      selectedServices: s.selectedServices.includes(id)
        ? s.selectedServices.filter((x) => x !== id)
        : [...s.selectedServices, id],
    }));
  const toggleAddon = (id) =>
    setSelection((s) => ({
      ...s,
      addons: s.addons.includes(id)
        ? s.addons.filter((x) => x !== id)
        : [...s.addons, id],
    }));

  /** Persist whatever institution metadata the user filled in step 0. */
  const persistProfile = useCallback(async () => {
    if (!user || user.role === "guest") return;
    if (profileSaving) return;
    const payload = {
      userType: selection.userType,
      institution: profileFields.institution,
      degree: profileFields.degree,
      yearOfStudy: profileFields.yearOfStudy,
      department: profileFields.department,
      researchDomain: profileFields.researchDomain,
      purposeOfUsage: profileFields.purposeOfUsage,
    };
    try {
      setProfileSaving(true);
      await api.put("/user/profile", payload);
    } catch (_err) {
      // Non-blocking: profile fields can be revisited later.
    } finally {
      setProfileSaving(false);
    }
  }, [user, profileSaving, selection.userType, profileFields]);

  const goNext = () => {
    if (stepIdx === 0) {
      // Fire-and-forget save; do not block the UI advance.
      persistProfile();
    }
    setStepIdx((i) => {
      const next = Math.min(STEPS.length - 1, i + 1);
      setMaxStepReached((m) => Math.max(m, next));
      return next;
    });
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  const stepValid = useMemo(() => {
    if (!quote) return false;
    if (stepIdx === 0) return !!selection.userType;
    if (stepIdx === 1) return !!selection.planName;
    if (stepIdx === 2) return !!selection.duration;
    return true;
  }, [quote, stepIdx, selection]);

  const proceedToPayment = useCallback(async () => {
    setError("");
    if (!quote) {
      setError("Pricing not ready, please wait.");
      return;
    }
    if (quote.totalPaise <= 0) {
      setError("Total is zero — please pick at least one paid item or upgrade your plan.");
      return;
    }
    if (!user || user.role === "guest") {
      setError("Please sign in with Google before subscribing.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setError("Razorpay checkout is not available. Refresh the page and try again.");
      return;
    }

    setProcessing(true);
    try {
      // Best-effort: capture institution metadata even if the user skipped to review.
      persistProfile();

      const { data: orderRes } = await api.post("/payment/create-order", {
        userType: selection.userType,
        planName: selection.planName,
        duration: selection.duration,
        selectedServices: selection.selectedServices,
        addons: selection.addons,
      });

      const checkoutKey =
        import.meta.env.VITE_RAZORPAY_KEY_ID || orderRes?.key || config?.razorpayKeyId;
      if (!checkoutKey) {
        throw new Error(
          "Missing Razorpay key. Set VITE_RAZORPAY_KEY_ID in frontend .env.local."
        );
      }

      const options = {
        key: checkoutKey,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "GAAS",
        description: `${quote.plan.label} • ${quote.duration.label}`,
        order_id: orderRes.orderId,
        handler: async (rzpRes) => {
          try {
            const { data: verifyRes } = await api.post("/payment/verify", {
              razorpay_order_id: rzpRes.razorpay_order_id,
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_signature: rzpRes.razorpay_signature,
            });
            await refreshSubscription();
            navigate("/payment/success", {
              replace: true,
              state: {
                subscription: verifyRes.subscription || null,
                paymentId: rzpRes.razorpay_payment_id,
              },
            });
          } catch (verifyErr) {
            console.error("Verify failed", verifyErr);
            navigate("/payment/failure", {
              replace: true,
              state: {
                reason:
                  verifyErr?.response?.data?.error ||
                  "Payment succeeded but verification failed. Contact support with your payment ID.",
                code: "VERIFY_FAILED",
                paymentId: rzpRes.razorpay_payment_id,
                orderId: rzpRes.razorpay_order_id,
                plan: `${quote.plan.label} • ${quote.duration.label}`,
              },
            });
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: user?.displayName || user?.name || "",
          email: user?.email || "",
        },
        theme: { color: "#16A34A" },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error("Payment failed", resp);
        navigate("/payment/failure", {
          replace: true,
          state: {
            reason:
              resp?.error?.description ||
              "Razorpay reported a payment failure.",
            code: resp?.error?.code || "PAYMENT_FAILED",
            paymentId: resp?.error?.metadata?.payment_id,
            orderId: resp?.error?.metadata?.order_id || orderRes.orderId,
            plan: `${quote.plan.label} • ${quote.duration.label}`,
          },
        });
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error("create-order failed", err);
      setError(err?.response?.data?.error || err.message || "Could not start payment.");
      setProcessing(false);
    }
  }, [quote, selection, user, scriptReady, config, refreshSubscription, navigate, persistProfile]);

  if (configError) {
    return (
      <div className="glass-card p-6 animate-in">
        <h1 className="text-xl font-bold text-gaas-heading">Subscription</h1>
        <p className="text-sm text-red-600 mt-2">{configError}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="glass-card p-6 animate-in">
        <p className="text-sm text-gaas-muted">Loading pricing...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 animate-in">
      <div className="space-y-4 min-w-0">
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold text-gaas-heading leading-tight">Subscribe to GAAS</h1>
              <p className="text-sm text-gaas-muted mt-1">
                {STEPS[stepIdx].subtitle}
              </p>
            </div>
            <div className="text-xs text-gaas-muted text-right">
              <p>
                Current plan:{" "}
                <span className="font-semibold text-gaas-heading">
                  {(currentPlan || "Guest").toString().replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </p>
              {planExpiresAt && (
                <p className="mt-0.5">Renews on {formatDate(planExpiresAt)}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <StepHeader
              steps={STEPS}
              activeIdx={stepIdx}
              onJump={setStepIdx}
              completedThrough={maxStepReached}
            />
          </div>
        </div>

        <div className="glass-card p-4">
            {stepIdx === 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {config.userTypes.map((u) => (
                    <ChoiceCard
                      key={u.id}
                      active={selection.userType === u.id}
                      onClick={() => setUserType(u.id)}
                    >
                      <p className="text-xs uppercase tracking-wide text-gaas-muted">
                        User type
                      </p>
                      <p className="text-lg font-bold text-gaas-heading mt-1">{u.label}</p>
                      <p className="text-xs text-gaas-muted mt-1 leading-snug">
                        {u.description}
                      </p>
                      <p className="text-sm font-semibold text-gaas-accent mt-3">
                        Base {formatINR(u.baseFee)}
                        <span className="text-xs text-gaas-muted font-medium"> / mo</span>
                      </p>
                    </ChoiceCard>
                  ))}
                </div>

                {selection.userType && (
                  <InstitutionFields
                    userType={selection.userType}
                    values={profileFields}
                    onChange={(patch) =>
                      setProfileFields((prev) => ({ ...prev, ...patch }))
                    }
                  />
                )}
              </>
            )}

            {stepIdx === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {config.plans.map((p) => (
                  <ChoiceCard
                    key={p.id}
                    active={selection.planName === p.id}
                    onClick={() => setPlan(p.id)}
                    popularLabel={p.popular ? "Most Popular" : null}
                  >
                    <p className="text-xs uppercase tracking-wide text-gaas-muted">Plan</p>
                    <p className="text-lg font-bold text-gaas-heading mt-1">{p.label}</p>
                    <p className="text-xs text-gaas-muted mt-1">{p.tagline}</p>
                    <p className="text-sm font-semibold text-gaas-accent mt-3">
                      {p.baseFee === 0
                        ? "+ ₹0 / mo"
                        : `+ ${formatINR(p.baseFee)} / mo`}
                    </p>
                    <ul className="text-xs text-gaas-text mt-3 space-y-1">
                      {p.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 mt-0.5">✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </ChoiceCard>
                ))}
              </div>
            )}

            {stepIdx === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {config.durations.map((d) => (
                  <ChoiceCard
                    key={d.id}
                    active={selection.duration === d.id}
                    onClick={() => setDuration(d.id)}
                  >
                    <p className="text-xs uppercase tracking-wide text-gaas-muted">
                      Cycle
                    </p>
                    <p className="text-lg font-bold text-gaas-heading mt-1">{d.label}</p>
                    <p className="text-xs text-gaas-muted mt-1">
                      Billed every {d.months} month{d.months > 1 ? "s" : ""}
                    </p>
                    {d.save && (
                      <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {d.save}
                      </span>
                    )}
                  </ChoiceCard>
                ))}
              </div>
            )}

            {stepIdx === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.services.map((s) => (
                  <ToggleCard
                    key={s.id}
                    active={selection.selectedServices.includes(s.id)}
                    onClick={() => toggleService(s.id)}
                    title={s.label}
                    description={s.description}
                    price={s.price}
                  />
                ))}
              </div>
            )}

            {stepIdx === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.addons.map((a) => (
                  <ToggleCard
                    key={a.id}
                    active={selection.addons.includes(a.id)}
                    onClick={() => toggleAddon(a.id)}
                    title={a.label}
                    description={a.description}
                    price={a.price}
                  />
                ))}
              </div>
            )}

            {stepIdx === 5 && quote && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gaas-border p-4 bg-gray-50/50">
                  <p className="text-xs uppercase tracking-wide text-gaas-muted">
                    Order summary
                  </p>
                  <ul className="mt-3 text-sm text-gaas-text space-y-2">
                    <li className="flex justify-between">
                      <span>{quote.userType.label} base</span>
                      <span>{formatINR(quote.userType.baseFee)} / mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span>{quote.plan.label} plan</span>
                      <span>
                        {quote.plan.baseFee === 0
                          ? "Included"
                          : `${formatINR(quote.plan.baseFee)} / mo`}
                      </span>
                    </li>
                    {quote.services.map((s) => (
                      <li key={s.id} className="flex justify-between">
                        <span>↳ {s.label}</span>
                        <span>
                          {s.price === 0 ? "Included" : `${formatINR(s.price)} / mo`}
                        </span>
                      </li>
                    ))}
                    {quote.addons.map((a) => (
                      <li key={a.id} className="flex justify-between">
                        <span>+ {a.label}</span>
                        <span>{formatINR(a.price)} / mo</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-gaas-muted">
                  By proceeding you agree to be billed via Razorpay. You'll get
                  immediate access to everything you selected.
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={goBack}
                disabled={stepIdx === 0 || processing}
              >
                Back
              </button>
              {stepIdx < STEPS.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={goNext}
                  disabled={!stepValid}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary max-w-full whitespace-normal text-center"
                  onClick={proceedToPayment}
                  disabled={processing || !quote || quote.totalPaise <= 0}
                >
                  {processing
                    ? "Processing..."
                    : `Proceed to Payment • ${formatINR(quote?.totalAmount || 0)}`}
                </button>
              )}
            </div>
          </div>

        {(ownedServices?.length || ownedAddons?.length) ? (
          <div className="glass-card p-4">
            <p className="text-xs uppercase tracking-wide text-gaas-muted">
              You currently own
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...(ownedServices || []), ...(ownedAddons || [])].map((id) => {
                const item =
                  config.services.find((s) => s.id === id) ||
                  config.addons.find((a) => a.id === id);
                return (
                  <span
                    key={id}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium"
                  >
                    {item?.label || id}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-4 self-start min-w-0">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-gaas-muted">
            Live pricing summary
          </p>
          <p className="text-[34px] font-extrabold text-gaas-heading mt-2 leading-tight tracking-tight break-words">
            {formatINR(quote?.totalAmount || 0)}
          </p>
          <p className="text-xs text-gaas-muted">
            Total for {quote?.duration?.label?.toLowerCase() || "selected cycle"} • incl. GST
          </p>

          <div className="mt-4 text-sm text-gaas-text space-y-2 border-t border-gaas-border pt-4">
            <div className="flex justify-between">
              <span className="text-gaas-muted">Monthly base</span>
              <span>{formatINR(quote?.monthlyBase || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gaas-muted">Services</span>
              <span>{formatINR(quote?.servicesSum || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gaas-muted">Add-ons</span>
              <span>{formatINR(quote?.addonsSum || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gaas-muted">
                Cycle ×{quote?.duration?.multiplier ?? 1}
              </span>
              <span>{formatINR(quote?.preTaxTotal || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gaas-muted">
                GST {Math.round((config.gstRate || 0.18) * 100)}%
              </span>
              <span>{formatINR(quote?.gstAmount || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-gaas-border pt-2 mt-2 font-bold text-gaas-heading">
              <span>Total</span>
              <span>{formatINR(quote?.totalAmount || 0)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gaas-muted space-y-1">
            <p>
              <span className="font-semibold text-gaas-text">Selected:</span>{" "}
              {quote ? (
                <>
                  {quote.userType.label} • {quote.plan.label} • {quote.duration.label}
                </>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="font-semibold text-gaas-text">Services:</span>{" "}
              {quote?.services?.length
                ? quote.services.map((s) => s.label).join(", ")
                : "None"}
            </p>
            <p>
              <span className="font-semibold text-gaas-text">Add-ons:</span>{" "}
              {quote?.addons?.length
                ? quote.addons.map((a) => a.label).join(", ")
                : "None"}
            </p>
          </div>

          {stepIdx < STEPS.length - 1 && (
            <button
              type="button"
              className="btn-primary w-full mt-4 text-sm whitespace-nowrap px-3 py-2 truncate"
              onClick={() => setStepIdx(STEPS.length - 1)}
              disabled={!quote || quote.totalPaise <= 0}
            >
              Skip to Review
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
