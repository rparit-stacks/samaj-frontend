import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { recordUserSessionExpiry } from "@/lib/api";
import { Shield } from "lucide-react";

/**
 * Landing page for native/deep-link Google Sign-In callbacks that deliver tokens
 * via URL hash (#accessToken=...&refreshToken=...) or query params (?success=true / ?error=...).
 * The web One Tap / popup flow never navigates here — see UserLogin's handleGoogleLogin.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      const params = new URLSearchParams(window.location.search);
      const success = params.get("success");
      const error = params.get("error");
      if (success === "true") {
        toast.success("Logged in successfully!");
        void refreshUser().finally(() => navigate("/", { replace: true }));
      } else if (error) {
        toast.error(decodeURIComponent(error));
        navigate("/login", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
      return;
    }
    const pairs = hash.slice(1).split("&");
    const params: Record<string, string> = {};
    pairs.forEach((p) => {
      const [k, v] = p.split("=");
      if (k && v) params[k] = decodeURIComponent(v);
    });
    const { accessToken, refreshToken, expiresIn } = params;
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      // Without this the keep-alive had no expiry to work from and never
      // refreshed, so the token quietly expired and later writes hit 401.
      recordUserSessionExpiry(expiresIn ? Number(expiresIn) : undefined);
      toast.success("Logged in with Google!");
      void refreshUser().finally(() => navigate("/", { replace: true }));
      return;
    }
    toast.error("Login failed");
    navigate("/login", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <AuthShell footer={null}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-md)]">
          <Shield className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="h-1.5 w-24 rounded-full skeleton-shimmer" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </AuthShell>
  );
}
