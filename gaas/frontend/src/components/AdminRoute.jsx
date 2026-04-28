import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdminUser } from "../config/admin";

/**
 * Client-side guard: only the configured admin email may open wrapped routes.
 * Server still enforces JWT + admin on GET /api/admin/users.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 text-3xl animate-pulse">🌿</div>
          <p className="text-sm text-slate-500">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
