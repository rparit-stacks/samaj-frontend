import { Navigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ONBOARDING_KEY = "samaj_onboarding_done";

function AuthSplash() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center auth-atmosphere px-6">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-md)]">
          <Shield className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-bold tracking-[0.22em] uppercase text-primary">Samaj</p>
          <div className="h-1.5 w-28 mx-auto rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

function getUnauthRedirect(): string {
  try {
    if (localStorage.getItem(ONBOARDING_KEY) !== "1") return "/onboarding";
  } catch {
    // ignore
  }
  return "/login";
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthSplash />;
  }

  if (!isAuthenticated) {
    return <Navigate to={getUnauthRedirect()} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
