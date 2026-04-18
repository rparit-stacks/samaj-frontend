import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function UserSignup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, completeSession } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.email.trim()) {
        toast.error("Email is required");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await authApi.register({
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        password: formData.password,
      });
      toast.success("OTP sent. In development, check the backend terminal for the code.");
      setOtpPhase(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await authApi.sendOtp({
        identifier: formData.email.trim(),
        type: "EMAIL",
        purpose: "REGISTRATION",
      });
      toast.success("OTP resent. In development, check the backend terminal.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.trim().replace(/\s/g, "");
    if (!code) {
      toast.error("Please enter the OTP");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      toast.error("Email missing — go back and start again");
      return;
    }
    setOtpLoading(true);
    try {
      const auth = await authApi.verifyOtp({
        identifier: email,
        code,
        purpose: "REGISTRATION",
      });

      // Must update AuthContext — only localStorage breaks ProtectedRoute (isAuthenticated stays false)
      completeSession(auth);

      if (formData.name.trim() || formData.phone?.trim()) {
        try {
          await authApi.updateProfile({
            name: formData.name.trim() || undefined,
            phone: formData.phone?.trim() || undefined,
          });
        } catch {
          /* ignore */
        }
      }

      toast.success("Account created and verified! Welcome!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-hero">
      <div className="h-[100dvh] md:grid md:grid-cols-2">
        {/* Hero / Image area */}
        <div className="relative h-[40dvh] md:h-auto md:min-h-[100dvh]">
          {/* Mobile hero */}
          <div className="md:hidden h-[40dvh] w-full bg-gradient-primary relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
            </div>
            <div className="relative h-full px-6 pt-10 pb-14 flex flex-col justify-end">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/25 shadow-glow">
                <span className="text-white font-bold text-2xl">स</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold text-white tracking-tight">Create your account</h1>
            </div>
          </div>

          {/* Desktop hero */}
          <div className="hidden md:flex h-full items-center justify-center p-10 bg-gradient-primary relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative max-w-md">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/15 ring-1 ring-white/25 shadow-glow">
                <span className="text-white font-bold text-3xl">स</span>
              </div>
              <h1 className="mt-6 text-4xl font-bold text-white tracking-tight">Samaj</h1>
              <p className="mt-3 text-white/85 text-base leading-relaxed">
                Join your community. Verify your email with OTP and get started.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 text-white/85 text-sm">
                <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-4">
                  <div className="font-semibold text-white">Simple</div>
                  <div className="mt-1 text-white/75">Quick signup flow</div>
                </div>
                <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-4">
                  <div className="font-semibold text-white">Verified</div>
                  <div className="mt-1 text-white/75">OTP based access</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="relative h-[60dvh] md:min-h-[100dvh] md:h-auto flex items-stretch md:items-center justify-center px-0 md:px-4 pb-0 md:py-10">
          {/* Background behind the card (mobile) - same as hero */}
          <div className="md:hidden absolute inset-0 bg-gradient-primary" aria-hidden="true" />
          <div className="md:hidden absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          </div>

          {/* Mobile bottom-sheet (edge-to-edge, only top corners rounded) */}
          <div className="relative w-full flex-1 min-h-0 flex items-stretch md:block md:max-w-md md:mt-0 md:px-0">
            <Card className="border-border/60 shadow-xl bg-gradient-card overflow-hidden w-full rounded-t-3xl rounded-b-none md:rounded-2xl md:border md:shadow-xl">
              <CardContent className="pt-6 pb-6 px-5 md:px-6 h-full flex flex-col min-h-0 overflow-auto scrollbar-hide">
                {/* Mobile header */}
                <div className="md:hidden mb-5">
                  <h2 className="text-xl font-bold leading-tight">
                    {otpPhase ? "Verify OTP" : step === 1 ? "Sign up" : "Personal info"}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {otpPhase ? "Enter the 6-digit code sent to your email" : "Create a new account"}
                  </p>
                </div>
                {/* Desktop header */}
                <div className="hidden md:block mb-6">
                  <h2 className="text-2xl font-bold">Sign Up</h2>
                  <p className="text-muted-foreground text-sm mt-1">Create a new account</p>
                </div>

                {otpPhase ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      We&apos;ve sent a 6-digit verification code to{" "}
                      <span className="font-medium">{formData.email}</span>. Enter it below to complete your signup.
                    </p>
                    <div className="space-y-2">
                      <Label>OTP Code</Label>
                      <Input
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                      >
                        Resend OTP
                      </Button>
                      <Button className="flex-1" onClick={handleVerifyOtp} disabled={otpLoading}>
                        {otpLoading ? "Verifying..." : "Verify & Continue"}
                      </Button>
                    </div>
                  </div>
                ) : step === 1 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Password (min 8 chars)</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-10 pr-10"
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button onClick={handleNext} className="w-full">
                      Next
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          autoComplete="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleBack} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
                        {isLoading ? "Sending OTP..." : "Send OTP"}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-center text-sm text-muted-foreground mt-5">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Login
                  </Link>
                </p>
              </CardContent>
            </Card>

            <div className="md:hidden h-safe-bottom" />
          </div>
        </div>
      </div>
    </div>
  );
}
