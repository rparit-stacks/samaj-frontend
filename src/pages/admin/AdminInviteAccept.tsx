import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Eye, EyeOff, Lock, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminInvitationApi, recordAdminSessionExpiry } from "@/lib/api";

type Step = "loading" | "set-password" | "verify-otp" | "success" | "error";

const SERVICE_LABELS: Record<string, string> = {
  COMMUNITY: "Community",
  DIRECTORY: "Directory",
  EMERGENCY: "Emergency",
  DOCUMENTS: "Documents",
  CHAT: "Chat",
  NEWS: "News & Content",
  EVENTS: "Events",
  KYC: "KYC Verification",
  NOTIFICATIONS: "Notifications",
  HISTORY: "Samaj History",
  APP_CONFIG: "App Config",
  EXAM: "Exams",
  MATRIMONY: "Matrimony",
  GALLERY: "Gallery",
  SUGGESTION: "Suggestions",
  ACHIEVER: "Achievers",
  BUSINESS: "Business",
  DONATION: "Donations",
  JOBS: "Job Listings",
};

export default function AdminInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load invitation details on mount
  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid invitation link.");
      setStep("error");
      return;
    }
    adminInvitationApi.getDetails(token)
      .then((data) => {
        setInviteEmail(data.email);
        setServiceKeys(data.serviceKeys);
        setExpiresAt(data.expiresAt);
        setStep("set-password");
      })
      .catch((err: Error) => {
        setErrorMsg(err.message || "This invitation is invalid or has expired.");
        setStep("error");
      });
  }, [token]);

  // Resend OTP countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!token) return;

    setSettingPassword(true);
    try {
      await adminInvitationApi.setPassword(token, password);
      setStep("verify-otp");
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? "";
    setOtp(next);
    const lastFilled = Math.min(text.length, 5);
    otpRefs.current[lastFilled]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { toast.error("Enter all 6 digits"); return; }
    if (!token) return;

    setVerifying(true);
    try {
      const res = await adminInvitationApi.verify(token, code);
      localStorage.setItem("adminAccessToken", res.accessToken);
      localStorage.setItem("adminRefreshToken", res.refreshToken);
      recordAdminSessionExpiry(res.expiresIn);
      if (res.user?.id) localStorage.setItem("samajAdminUserId", res.user.id);
      setStep("success");
      setTimeout(() => navigate("/admin/dashboard", { replace: true }), 2200);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!token || resendCooldown > 0) return;
    try {
      await adminInvitationApi.setPassword(token, password);
      setResendCooldown(60);
      toast.success("OTP resent to " + inviteEmail);
    } catch {
      toast.error("Failed to resend OTP");
    }
  };

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 overflow-hidden relative">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/6 blur-[130px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/6 blur-[130px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage:
            "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-[460px]">

        {/* Logo */}
        <div className="flex justify-center mb-7">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-900/50">
              <span className="text-white font-bold text-xl leading-none select-none">स</span>
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-blue-500/12 blur-lg -z-10" />
          </div>
        </div>

        {/* ── Loading ── */}
        {step === "loading" && (
          <div className="text-center space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Checking invitation…</p>
          </div>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <div className="bg-white/[0.04] border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="mx-auto h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Invitation Invalid</h2>
            <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate("/admin/login")}
              className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Go to admin login
            </button>
          </div>
        )}

        {/* ── Step 1: Set Password ── */}
        {step === "set-password" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-[1.5rem] font-bold text-white tracking-tight">Accept Invitation</h1>
              <p className="mt-1 text-sm text-slate-500">Set up your admin account for <span className="text-slate-300">{inviteEmail}</span></p>
            </div>

            {/* Services badge list */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 mb-6">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">Your Assigned Services</p>
              <div className="flex flex-wrap gap-2">
                {serviceKeys.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium"
                  >
                    {SERVICE_LABELS[k] ?? k}
                  </span>
                ))}
              </div>
              {expiresLabel && (
                <p className="mt-2.5 text-[10px] text-slate-700">Expires: {expiresLabel}</p>
              )}
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 backdrop-blur-xl">
              <form onSubmit={handleSetPassword} className="space-y-5" noValidate>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      className={cn(
                        "w-full h-11 rounded-xl px-4 pr-11 text-sm text-white bg-white/[0.06] border border-white/[0.10]",
                        "placeholder:text-slate-700 outline-none caret-blue-400",
                        "focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
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

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      "w-full h-11 rounded-xl px-4 text-sm text-white bg-white/[0.06] border border-white/[0.10]",
                      "placeholder:text-slate-700 outline-none caret-blue-400",
                      "focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150",
                      confirmPassword && confirmPassword !== password && "border-red-500/50"
                    )}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={settingPassword || !password || !confirmPassword}
                  className={cn(
                    "w-full h-11 rounded-xl text-sm font-semibold text-white mt-1",
                    "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
                    "active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed",
                    "shadow-lg shadow-blue-900/30 transition-all duration-150",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {settingPassword ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Continue — Send OTP
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── Step 2: Verify OTP ── */}
        {step === "verify-otp" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-[1.5rem] font-bold text-white tracking-tight">Verify Your Email</h1>
              <p className="mt-1 text-sm text-slate-500">
                A 6-digit code was sent to <span className="text-slate-300">{inviteEmail}</span>
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 backdrop-blur-xl space-y-6">

              {/* OTP boxes */}
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={cn(
                      "w-11 h-14 text-center text-xl font-bold rounded-xl text-white",
                      "bg-white/[0.07] border border-white/[0.12] outline-none",
                      "focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20",
                      "caret-transparent transition-all duration-150",
                      digit ? "border-blue-500/40 bg-blue-500/10" : ""
                    )}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={verifying || otp.join("").length < 6}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-semibold text-white",
                  "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
                  "active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed",
                  "shadow-lg shadow-blue-900/30 transition-all duration-150",
                  "flex items-center justify-center gap-2"
                )}
              >
                {verifying ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Verify &amp; Activate Account
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Success ── */}
        {step === "success" && (
          <div className="bg-white/[0.04] border border-green-500/20 rounded-2xl p-10 text-center backdrop-blur-xl space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Account activated!</h2>
              <p className="mt-1.5 text-sm text-slate-400">Opening your admin dashboard…</p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {serviceKeys.map((k) => (
                <span key={k} className="text-xs px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 font-medium">
                  {SERVICE_LABELS[k] ?? k}
                </span>
              ))}
            </div>
            <div className="mx-auto h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
