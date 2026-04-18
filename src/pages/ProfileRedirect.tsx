import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api";

/**
 * /profile → redirects to /profile/{profileKey} (Instagram-style canonical URL).
 * While loading, shows a spinner. If no key found, falls back to /profile/me.
 */
export default function ProfileRedirect() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: userApi.getProfile,
  });

  const key = profile?.profileKey ?? user?.profileKey;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (key) {
    return <Navigate to={`/profile/${encodeURIComponent(key)}`} replace />;
  }

  if (user?.id) {
    return <Navigate to={`/user/${user.id}`} replace />;
  }

  return <Navigate to="/login" replace />;
}
