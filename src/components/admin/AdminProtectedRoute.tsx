import { Navigate, useLocation } from "react-router-dom";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem("adminAccessToken");
  if (!token) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

