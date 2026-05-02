import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ensureAppJwtFromGoogleIdToken } from "../api";
import { useAuth } from "./useAuth";

const DEFAULT_SUBSCRIPTION = {
  role: "guest",
  plan: "basic",
  planExpiresAt: null,
  userType: null,
  planName: null,
  duration: null,
  selectedServices: [],
  addons: [],
};

/**
 * Legacy plan-tier rules (used as a fallback when the user pre-dates the
 * multi-step wizard). For new subscriptions the authoritative gate is the
 * purchased `selectedServices` / `addons` list — see `FEATURE_TO_ITEM`.
 */
const ACCESS_RULES = {
  liveData: ["guest", "basic", "premium"],
  cropRecommendation: ["premium"],
  yieldPrediction: ["premium"],
  downloadData: ["basic", "premium"],
  pestDisease: ["premium"],
  mqtt: ["premium"],
  unlimitedDownloads: ["premium"],
};

/**
 * Maps a feature key (used by `canAccess(featureName)` across the app) to one
 * or more wizard service/add-on ids that grant access. If *any* of the
 * mapped ids appears in the user's purchased lists, the feature is unlocked.
 *
 * Update this map when you add new wizard items in `pricingConfig.js`.
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
  unlimitedDownloads: ["realtime_iot_dashboard"],
};

export function useSubscription() {
  const { user, isAdmin } = useAuth();
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!user || user.role === "guest") {
      setSubscription({ ...DEFAULT_SUBSCRIPTION, role: "guest", plan: "none" });
      setLoading(false);
      return;
    }

    try {
      if (user?.provider === "google") {
        await ensureAppJwtFromGoogleIdToken();
      }
      const { data } = await api.get("/subscription");
      setSubscription({
        role: data?.role || "basic",
        plan: data?.plan || user?.plan || "basic",
        planExpiresAt: data?.planExpiresAt || null,
        userType: data?.userType || null,
        planName: data?.planName || null,
        duration: data?.duration || null,
        selectedServices: Array.isArray(data?.selectedServices)
          ? data.selectedServices
          : [],
        addons: Array.isArray(data?.addons) ? data.addons : [],
      });
    } catch (err) {
      console.error("Failed to fetch subscription", err);
      const fallbackPlan =
        user?.plan && user.plan !== "none" ? user.plan : "basic";
      setSubscription({
        ...DEFAULT_SUBSCRIPTION,
        role: "basic",
        plan: fallbackPlan,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refreshSubscription();
  }, [refreshSubscription]);

  const canAccess = useCallback(
    (featureName) => {
      if (isAdmin || user?.role === "admin") return true;

      const owned = new Set([
        ...(subscription.selectedServices || []),
        ...(subscription.addons || []),
      ]);
      const itemIds = FEATURE_TO_ITEM[featureName];
      if (itemIds && itemIds.some((id) => owned.has(id))) {
        return true;
      }

      const allowedRoles = ACCESS_RULES[featureName];
      if (!allowedRoles) return false;
      const role = subscription?.role || "guest";
      return allowedRoles.includes(role);
    },
    [subscription, isAdmin, user?.role]
  );

  const value = useMemo(
    () => ({
      loading,
      plan: subscription.plan,
      role: subscription.role,
      planExpiresAt: subscription.planExpiresAt,
      userType: subscription.userType,
      planName: subscription.planName,
      duration: subscription.duration,
      selectedServices: subscription.selectedServices,
      addons: subscription.addons,
      canAccess,
      refreshSubscription,
    }),
    [loading, subscription, canAccess, refreshSubscription]
  );

  return value;
}
