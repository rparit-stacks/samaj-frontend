import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      const params = new URLSearchParams(window.location.search);
      const success = params.get("success");
      const error = params.get("error");
      if (success === "true") {
        setStatus("success");
        toast.success("Logged in successfully!");
        navigate("/", { replace: true });
      } else if (error) {
        setStatus("error");
        toast.error(decodeURIComponent(error));
        navigate("/login", { replace: true });
      } else {
        setStatus("error");
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
    const { accessToken, refreshToken } = params;
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      setStatus("success");
      toast.success("Logged in with Google!");
      navigate("/", { replace: true });
    } else {
      setStatus("error");
      toast.error("Login failed");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Completing sign in...</p>
        </div>
      )}
    </div>
  );
}
