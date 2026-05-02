import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LandingHome from "../landing/LandingHome";

/**
 * Public marketing homepage (`/`) — matches `webbsite-main/artifacts/smart-greenhouse` design.
 * Authenticated users never land here; `App.jsx` routes them straight to the dashboard.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  return <LandingHome />;
}
