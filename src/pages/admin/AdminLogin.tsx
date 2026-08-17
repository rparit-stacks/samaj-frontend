import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { adminAuthLogin, fetchSetupStatus, recordAdminSessionExpiry } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { setupRequired } = await fetchSetupStatus();
        if (!cancelled && setupRequired) navigate("/install", { replace: true });
      } catch {
        /* stay on login */
      } finally {
        if (!cancelled) {
          setCheckingSetup(false);
          setTimeout(() => emailRef.current?.focus(), 80);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return;
    setIsLoading(true);
    try {
      const res = await adminAuthLogin<{
        accessToken: string;
        refreshToken: string;
        expiresIn?: number;
        user: { role: string; id?: string };
      }>({ identifier: form.email.trim(), password: form.password });

      const role = (res.user?.role ?? "").toUpperCase();
      if (role !== "ADMIN" && role !== "MODERATOR") throw new Error("Not an admin account");

      localStorage.setItem("adminAccessToken", res.accessToken);
      localStorage.setItem("adminRefreshToken", res.refreshToken);
      recordAdminSessionExpiry(res.expiresIn);
      if (res.user?.id) localStorage.setItem("samajAdminUserId", res.user.id);

      setRedirecting(true);
      setTimeout(() => navigate("/admin/dashboard", { replace: true }), 60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setIsLoading(false);
    }
  };

  if (checkingSetup || redirecting) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 animate-ping" />
          </div>
          <p className="text-slate-400 text-sm">
            {redirecting ? "Opening dashboard…" : "Checking…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 overflow-hidden relative">

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px]">

        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <BrandLogo className="h-16 w-16 shadow-2xl shadow-black/50" />
            <div className="absolute -inset-2 rounded-3xl bg-rose-500/15 blur-lg -z-10" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-[1.65rem] font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to access the Samaj control panel</p>
        </div>

        {/* Form card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Email Address
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@yourdomain.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={cn(
                  "w-full h-11 rounded-xl px-4 text-sm text-white bg-white/[0.06] border border-white/[0.10]",
                  "placeholder:text-slate-700 outline-none caret-blue-400",
                  "focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/15",
                  "transition-all duration-150"
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={cn(
                    "w-full h-11 rounded-xl px-4 pr-11 text-sm text-white bg-white/[0.06] border border-white/[0.10]",
                    "placeholder:text-slate-700 outline-none caret-blue-400",
                    "focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/15",
                    "transition-all duration-150"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !form.email.trim() || !form.password}
              className={cn(
                "w-full h-11 rounded-xl text-sm font-semibold text-white mt-1",
                "bg-gradient-to-r from-blue-600 to-indigo-600",
                "hover:from-blue-500 hover:to-indigo-500",
                "active:scale-[0.98] active:from-blue-700 active:to-indigo-700",
                "disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100",
                "shadow-lg shadow-blue-900/30 transition-all duration-150",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/[0.05] space-y-1.5 text-center">
            <p className="text-[11px] text-slate-700">Protected area — authorised personnel only</p>
            <p className="text-[11px] text-slate-700">
              First-time setup?{" "}
              <Link to="/install" className="text-blue-500 hover:text-blue-400 transition-colors">
                Open install page
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-700">
          Received an invitation email?{" "}
          <span className="text-slate-600">Click the link in that email to get started.</span>
        </p>
      </div>
    </div>
  );
}
