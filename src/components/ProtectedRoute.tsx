import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { AccountNotActiveScreen } from "@/components/AccountNotActiveScreen";
import { OfflineScreen } from "@/components/OfflineScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ONBOARDING_KEY = "samaj_onboarding_done";

function AuthSplash() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center auth-atmosphere px-6">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <BrandLogo className="h-16 w-16 shadow-[var(--shadow-md)]" />
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
  const { user, isAuthenticated, isLoading, isOffline, refreshUser, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthSplash />;
  }

  // Offline is checked before the auth redirect on purpose: failing to reach
  // the server is not the same as being signed out, and bouncing the user to
  // the login page (where they also cannot log in) would lose their session.
  if (isOffline && !isAuthenticated) {
    return <OfflineScreen onRetry={refreshUser} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={getUnauthRedirect()} state={{ from: location }} replace />;
  }

  if (user && user.status && user.status !== "ACTIVE") {
    return <AccountNotActiveScreen status={user.status} onRefresh={refreshUser} onLogout={logout} />;
  }

  return <>{children}</>;
}
