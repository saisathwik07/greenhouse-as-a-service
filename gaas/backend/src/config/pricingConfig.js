/**
 * Single source of truth for SaaS subscription pricing.
 *
 * The frontend wizard fetches this config via `GET /api/payment/pricing-config`
 * for display, but the *authoritative* total is always recomputed on the
 * backend in `/payment/create-order` from the same tables. Never trust a
 * client-supplied price.
 *
 * Money is stored in rupees throughout the config; `computeQuote` returns the
 * paise value for Razorpay (`amountPaise`).
 */

const GST_RATE = 0.18;

const USER_TYPES = [
  {
    id: "student",
    label: "Student",
    description: "Discounted pricing for verified students",
    baseFee: 99,
  },
  {
    id: "faculty",
    label: "Faculty",
    description: "For teaching staff and academic departments",
    baseFee: 199,
  },
  {
    id: "researcher",
    label: "Researcher",
    description: "For research labs, scholars and PhD programs",
    baseFee: 299,
  },
];

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    tagline: "Get started with the essentials",
    baseFee: 0,
    legacyName: "Basic",
    userPlan: "basic",
    highlights: [
      "Live sensor dashboard",
      "Recent data downloads",
      "Email support",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    tagline: "Most popular for active growers",
    baseFee: 300,
    legacyName: "Pro",
    userPlan: "pro",
    popular: true,
    highlights: [
      "Everything in Starter",
      "Crop & Yield AI",
      "Pest & Disease detection",
      "Priority email support",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    tagline: "Full automation for greenhouses",
    baseFee: 800,
    legacyName: "Premium",
    userPlan: "pro",
    highlights: [
      "Everything in Pro",
      "Real-time IoT / MQTT dashboard",
      "Greenhouse simulation",
      "Dedicated support",
    ],
  },
];

const DURATIONS = [
  { id: "monthly", label: "Monthly", months: 1, multiplier: 1.0, save: "" },
  {
    id: "quarterly",
    label: "Quarterly",
    months: 3,
    multiplier: 2.7,
    save: "Save 10%",
  },
  { id: "yearly", label: "Yearly", months: 12, multiplier: 9.6, save: "Save 20%" },
];

const SERVICES = [
  {
    id: "data_as_a_service",
    label: "Data as a Service",
    description: "Live sensor stream + 24h history",
    price: 0,
    feature: "liveData",
  },
  {
    id: "crop_recommendations",
    label: "Crop Recommendations",
    description: "AI-powered crop suggestions for your soil",
    price: 49,
    feature: "cropRecommendation",
  },
  {
    id: "yield_prediction",
    label: "Yield Prediction",
    description: "Forecast yield from soil + weather",
    price: 59,
    feature: "yieldPrediction",
  },
  {
    id: "pest_disease",
    label: "Pest & Disease Prediction",
    description: "Image-based disease detection model",
    price: 79,
    feature: "pestDisease",
  },
  {
    id: "fertigation_advisory",
    label: "Fertigation Advisory",
    description: "NPK & EC dosage recommendations",
    price: 69,
    feature: "fertigation",
  },
  {
    id: "irrigation_scheduling",
    label: "Irrigation Scheduling",
    description: "Smart watering plans by crop stage",
    price: 49,
    feature: "irrigation",
  },
];

const ADDONS = [
  {
    id: "ai_crop_recommendation",
    label: "AI Crop Recommendation Plus",
    description: "Multi-model ensemble for higher accuracy",
    price: 99,
    feature: "aiCropPlus",
  },
  {
    id: "realtime_iot_dashboard",
    label: "Real-time IoT Dashboard",
    description: "MQTT live feed with alerts",
    price: 149,
    feature: "mqtt",
  },
  {
    id: "priority_support",
    label: "Priority Support",
    description: "Same-day response, dedicated channel",
    price: 199,
    feature: "prioritySupport",
  },
];

const indexById = (arr) =>
  arr.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

const USER_TYPE_BY_ID = indexById(USER_TYPES);
const PLAN_BY_ID = indexById(PLANS);
const DURATION_BY_ID = indexById(DURATIONS);
const SERVICE_BY_ID = indexById(SERVICES);
const ADDON_BY_ID = indexById(ADDONS);

function asUniqueIdList(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length > 0)
    )
  );
}

/** Round to 2dp to avoid float drift like 269.99999999 from multipliers. */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Validate a wizard selection and compute the authoritative quote.
 *
 * @returns {{
 *   userType, plan, duration,
 *   selectedServices: string[], addons: string[],
 *   monthlyBase: number, monthlySubtotal: number,
 *   preTaxTotal: number, gstAmount: number,
 *   totalAmount: number, totalPaise: number,
 *   currency: 'INR'
 * }}
 */
function computeQuote(input) {
  const userType = USER_TYPE_BY_ID[String(input?.userType || "").toLowerCase()];
  const plan = PLAN_BY_ID[String(input?.planName || input?.plan || "").toLowerCase()];
  const duration = DURATION_BY_ID[String(input?.duration || "").toLowerCase()];

  if (!userType) throw new Error("Invalid userType");
  if (!plan) throw new Error("Invalid plan");
  if (!duration) throw new Error("Invalid duration");

  const selectedServices = asUniqueIdList(input?.selectedServices).filter(
    (id) => SERVICE_BY_ID[id]
  );
  const addons = asUniqueIdList(input?.addons).filter((id) => ADDON_BY_ID[id]);

  const servicesSum = selectedServices.reduce(
    (sum, id) => sum + SERVICE_BY_ID[id].price,
    0
  );
  const addonsSum = addons.reduce((sum, id) => sum + ADDON_BY_ID[id].price, 0);

  const monthlyBase = userType.baseFee + plan.baseFee;
  const monthlySubtotal = monthlyBase + servicesSum + addonsSum;

  const preTaxTotal = round2(monthlySubtotal * duration.multiplier);
  const gstAmount = round2(preTaxTotal * GST_RATE);
  const totalAmount = round2(preTaxTotal + gstAmount);
  const totalPaise = Math.round(totalAmount * 100);

  return {
    userType: userType.id,
    plan: plan.id,
    planName: plan.label,
    legacyPlanName: plan.legacyName,
    userPlan: plan.userPlan,
    duration: duration.id,
    months: duration.months,
    selectedServices,
    addons,
    breakdown: {
      userTypeFee: userType.baseFee,
      planFee: plan.baseFee,
      servicesSum,
      addonsSum,
      monthlyBase,
      monthlySubtotal,
      durationMultiplier: duration.multiplier,
      gstRate: GST_RATE,
    },
    preTaxTotal,
    gstAmount,
    totalAmount,
    totalPaise,
    currency: "INR",
  };
}

/** Public, JSON-safe view used by the frontend wizard. */
function getPublicConfig() {
  return {
    gstRate: GST_RATE,
    userTypes: USER_TYPES,
    plans: PLANS,
    durations: DURATIONS,
    services: SERVICES,
    addons: ADDONS,
  };
}

module.exports = {
  GST_RATE,
  USER_TYPES,
  PLANS,
  DURATIONS,
  SERVICES,
  ADDONS,
  USER_TYPE_BY_ID,
  PLAN_BY_ID,
  DURATION_BY_ID,
  SERVICE_BY_ID,
  ADDON_BY_ID,
  computeQuote,
  getPublicConfig,
};
