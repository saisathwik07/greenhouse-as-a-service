import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ensureAppJwtFromGoogleIdToken } from "../api";
import { useAuth } from "./useAuth";

const DEFAULT_SUBSCRIPTION = {
  role: "guest",
  plan: "basic",
  planExpiresAt: null,
};

/**
 * `role` comes from GET /api/subscription: guest | basic | premium (premium = Standard/Pro tier).
 * - Guest: dashboard (liveData) only.
 * - Basic (free default for signed-in users): live data + downloads; crop & yield require Standard+.
 */
const ACCESS_RULES = {
  liveData: ["guest", "basic", "premium"],
  cropRecommendation: ["premium"],
  yieldPrediction: ["premium"],
  downloadData: ["basic", "premium"],
  pestDisease: ["premium"],
  greenhouseSim: ["premium"],
  mqtt: ["premium"],
  unlimitedDownloads: ["premium"],
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
      });
    } catch (err) {
      console.error("Failed to fetch subscription", err);
      const fallbackPlan =
        user?.plan && user.plan !== "none" ? user.plan : "basic";
      setSubscription({
        role: "basic",
        plan: fallbackPlan,
        planExpiresAt: null,
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
      canAccess,
      refreshSubscription,
    }),
    [loading, subscription, canAccess, refreshSubscription]
  );

  return value;
}
