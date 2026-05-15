import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ requires = "admin", children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="p-8 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Loading…
      </div>
    );

  if (!user || user.type !== requires) {
    const target = requires === "admin" ? "/login" : "/";
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  return children;
}
