import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Logged-in guests may only use the dashboard; redirect elsewhere to home. */
export default function NonGuestRoute({ children }) {
  const { isGuest } = useAuth();
  if (isGuest) return <Navigate to="/" replace />;
  return children;
}
