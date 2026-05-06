import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { adminAuthLogin, fetchSetupStatus, recordAdminSessionExpiry } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { setupRequired } = await fetchSetupStatus();
        if (!cancelled && setupRequired) {
          navigate("/install", { replace: true });
        }
      } catch {
        /* stay on login if API unreachable */
      } finally {
        if (!cancelled) setCheckingSetup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await adminAuthLogin<{
        accessToken: string;
        refreshToken: string;
        expiresIn?: number;
        user: { role: string; id?: string };
      }>({ identifier: formData.email, password: formData.password });

      const role = (res.user?.role ?? "").toUpperCase();
      if (role !== "ADMIN" && role !== "MODERATOR") {
        throw new Error("Not an admin account");
      }

      localStorage.setItem("adminAccessToken", res.accessToken);
      localStorage.setItem("adminRefreshToken", res.refreshToken);
      recordAdminSessionExpiry(res.expiresIn);
      if (res.user?.id) {
        localStorage.setItem("samajAdminUserId", res.user.id);
      }

      toast.success("Login successful!");
      setRedirecting(true);
      // Small delay so the user sees the transition loader instantly.
      window.setTimeout(() => navigate("/admin/dashboard"), 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSetup || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 border-2 border-white/25 border-t-white rounded-full animate-spin" />
          <p className="mt-4 text-slate-300 text-sm">
            {redirecting ? "Preparing dashboard…" : "Loading…"}
          </p>
          {redirecting && (
            <p className="mt-1 text-slate-500 text-xs">
              Please wait while we load admin data.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/80 border-slate-700 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Admin Portal</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to access the admin dashboard
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="samaj@samaj.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400">
                <input type="checkbox" className="rounded border-slate-600 bg-slate-700" />
                Remember me
              </label>
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            <p className="text-slate-500 text-sm">
              Protected area. Authorized personnel only.
            </p>
            <p className="text-slate-500 text-sm">
              First-time server setup?{" "}
              <Link to="/install" className="text-primary hover:underline">
                Open install page
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
