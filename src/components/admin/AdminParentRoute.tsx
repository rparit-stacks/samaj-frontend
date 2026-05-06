import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminSystemApi } from "@/lib/api";

export function AdminParentRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem("adminAccessToken");
  if (!token) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  const { data: me, isPending } = useQuery({
    queryKey: ["admin", "system", "me"],
    queryFn: adminSystemApi.me,
  });

  if (isPending) return null;

  const isParent = !!me && (me.fullAccess || me.parentAdmin || String(me.role).toUpperCase() === "ADMIN");
  if (!isParent) return <Navigate to="/admin/dashboard" replace />;

  return <>{children}</>;
}

