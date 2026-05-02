const { authenticate } = require("./authenticate");
const User = require("../models/User");
const {
  getActiveSubscription,
} = require("../services/subscriptionService");
const { trackEvent, touchUserActivity } = require("../services/eventTracker");

/**
 * Maps a coarse feature key to the wizard service/add-on ids that grant it.
 * Mirrors `FEATURE_TO_ITEM` in `frontend/src/hooks/useSubscription.js`.
 */
const FEATURE_TO_ITEM = {
  liveData: ["data_as_a_service"],
  downloadData: ["data_as_a_service"],
  cropRecommendation: ["crop_recommendations", "ai_crop_recommendation"],
  yieldPrediction: ["yield_prediction"],
  pestDisease: ["pest_disease"],
  fertigation: ["fertigation_advisory"],
  irrigation: ["irrigation_scheduling"],
  mqtt: ["realtime_iot_dashboard"],
  prioritySupport: ["priority_support"],
};

/** Legacy plan tiers that still grant access (used until users migrate). */
const LEGACY_PLAN_BYPASS = new Set(["pro", "premium", "standard"]);

/**
 * `requireEntitlement(featureKey)` => Express middleware. Allows the request
 * iff:
 *   - the user is authenticated, AND
 *   - the user is an admin, OR
 *   - the active Subscription contains a service/add-on matching `featureKey`,
 *     OR
 *   - the user's legacy `plan` field is "pro" / "premium" / "standard".
 *
 * Adds `req.entitlements = { services, addons, plan }` for downstream handlers.
 */
function requireEntitlement(featureKey) {
  return [
    authenticate,
    async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        if ((req.user?.role || "").toLowerCase() === "admin") {
          req.entitlements = { admin: true, services: [], addons: [], plan: null };
          touchUserActivity(userId);
          trackEvent({ userId, type: "feature_used", featureKey, req });
          return next();
        }

        const [user, sub] = await Promise.all([
          User.findById(userId).select("plan").lean(),
          getActiveSubscription(userId),
        ]);

        const services = sub?.selectedServices || [];
        const addons = sub?.addons || [];
        const owned = new Set([...services, ...addons]);

        const allowedItems = FEATURE_TO_ITEM[featureKey] || [];
        const hasItem = allowedItems.some((id) => owned.has(id));
        const legacyOk = LEGACY_PLAN_BYPASS.has(String(user?.plan || "").toLowerCase());

        if (!hasItem && !legacyOk) {
          return res.status(402).json({
            error: "Feature not included in your current subscription.",
            feature: featureKey,
            required: allowedItems,
            upgradeUrl: "/subscription",
          });
        }

        req.entitlements = {
          admin: false,
          services,
          addons,
          plan: user?.plan || null,
        };
        touchUserActivity(userId);
        trackEvent({ userId, type: "feature_used", featureKey, req });
        return next();
      } catch (err) {
        return next(err);
      }
    },
  ];
}

module.exports = { requireEntitlement, FEATURE_TO_ITEM };
