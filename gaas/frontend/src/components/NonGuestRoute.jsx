import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  GUEST_FEATURE_LOCKED_TITLE,
  getGuestFeatureLabel,
  useGuestAccess,
} from "../hooks/useGuestAccess";

function guestFeatureGateActive(featureName) {
  if (featureName == null) return false;
  if (Array.isArray(featureName)) return featureName.length > 0;
  return String(featureName).trim().length > 0;
}

/** Guest routes: feature-gated paths check the guest-access registry; account-style routes stay open unless wrapped with a gate. */
export default function NonGuestRoute({ children, featureName, title }) {
  const { isGuest } = useAuth();
  const { loading, isGuestFeatureUnlocked, openGuestAccessModal } = useGuestAccess();
  const gated = guestFeatureGateActive(featureName);
  const allowed =
    !isGuest || !gated || isGuestFeatureUnlocked(featureName);
  const label = title || getGuestFeatureLabel(featureName);

  useEffect(() => {
    if (!isGuest || loading || allowed || !gated) return;
    openGuestAccessModal({
      featureName,
      title: GUEST_FEATURE_LOCKED_TITLE,
      message: `${label} is locked for guests with the current admin settings.`,
    });
  }, [allowed, featureName, isGuest, gated, label, loading, openGuestAccessModal]);

  if (isGuest && loading && gated) {
    return (
      <div className="glass-card p-6 text-sm text-gaas-muted">
        Checking guest access...
      </div>
    );
  }

  if (isGuest && gated && !allowed) return <Navigate to="/" replace />;
  return children;
}
