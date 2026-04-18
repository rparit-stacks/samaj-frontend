import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import MemberDetail from "./MemberDetail";

/**
 * Instagram-style profile routing:
 *
 *  /profile          → redirect to /profile/{myProfileKey}
 *  /profile/:handle  → always render MemberDetail (owner gets edit controls on same layout)
 */
export default function ProfileRouter() {
  const { id: handle } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!handle) {
    const myKey = user?.profileKey;
    if (myKey) {
      return <Navigate to={`/profile/${encodeURIComponent(myKey)}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <MemberDetail />;
}
