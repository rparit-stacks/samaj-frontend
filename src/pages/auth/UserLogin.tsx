import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { authApi, googleApi } from "@/lib/api";
import { startGoogleSignIn, isNativeAppShell } from "@/lib/googleBridge";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { BrandLogo } from "@/components/BrandLogo";

const ONBOARDING_KEY = "samaj_onboarding_done";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function UserLogin() {
  const navigate = useNavigate();
  const { login, loginWithOtp, completeSession, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    if (!authLoading && !isAuthenticated) {
      try {
        if (localStorage.getItem(ONBOARDING_KEY) !== "1") {
          navigate("/onboarding", { replace: true });
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [shake, setShake] = useState(false);
  /** Google Sign-In only on web — hidden in native Android/iOS app. */
  const showGoogleLogin = useMemo(() => !isNativeAppShell(), []);

  const [otpPhase, setOtpPhase] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: useMemo(() => ({ email: "", password: "" }), []),
    mode: "onSubmit",
  });

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(
          [35, 40, 35]
        );
      }
    } catch {
      // ignore
    }
  };

  const handleLogin = async (values: LoginValues) => {
    if (otpPhase) {
      await handleVerifyOtp();
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(values.email.trim(), values.password);
      if (result.kind === "challenge") {
        setOtpIdentifier(result.identifier);
        setOtpPhase(true);
        setOtp("");
        toast.success(result.message || "Verification code sent to your email.");
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit verification code");
      return;
    }
    setOtpLoading(true);
    try {
      await loginWithOtp(otpIdentifier, code);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
      triggerShake();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpIdentifier) return;
    setOtpLoading(true);
    try {
      await authApi.sendOtp({
        identifier: otpIdentifier,
        type: "EMAIL",
        purpose: "LOGIN",
      });
      toast.success("Verification code resent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleUseDifferentAccount = () => {
    setOtpPhase(false);
    setOtp("");
    setOtpIdentifier("");
  };

  const handleGoogleLogin = () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    startGoogleSignIn(
      async (idToken) => {
        try {
          const result = await googleApi.verifyIdToken(idToken);
          if (result.kind === "login" && result.accessToken && result.refreshToken && result.user) {
            completeSession({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              expiresIn: result.expiresIn ?? 0,
              user: result.user,
            });
            toast.success("Welcome back!");
            navigate("/", { replace: true });
          } else if (result.kind === "signup") {
            navigate("/google-complete", {
              state: {
                tempToken: result.tempToken,
                email: result.email,
                name: result.name,
                picture: result.picture,
              },
            });
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Google Sign-In failed");
        } finally {
          setGoogleLoading(false);
        }
      },
      (error) => {
        setGoogleLoading(false);
        if (error !== "Google Sign-In was cancelled") {
          toast.error(error);
        }
      }
    );
  };

  if (authLoading) {
    return (
      <AuthShell footer={null}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
          <BrandLogo className="h-14 w-14 shadow-[var(--shadow-md)]" />
          <div className="h-1.5 w-24 rounded-full skeleton-shimmer" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="pt-6 animate-slide-up">
        {/* Brand mark */}
        <div className="flex justify-center">
          <BrandLogo
            className={cn(
              "h-16 w-16 shadow-[var(--shadow-md)]",
              shake && "animate-vibrate"
            )}
          />
        </div>

        <div className="text-center mt-5">
          <p className="text-xs font-bold tracking-[0.22em] uppercase text-primary mb-2">Samaj</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {otpPhase ? "Verify it's you" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {otpPhase
              ? `Enter the 6-digit code sent to ${otpIdentifier}`
              : "Sign in to your Samaj account"}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleLogin)}
            className="mt-8 space-y-4"
            noValidate
          >
            <div
              className={cn(
                "space-y-4 transition-all duration-300",
                otpPhase && "opacity-50 pointer-events-none"
              )}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AuthField
                        {...field}
                        label="Email Address"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={otpPhase}
                        leadingIcon={<Mail />}
                        error={form.formState.errors.email?.message}
                        enterKeyHint="next"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            passwordRef.current?.focus();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="sr-only" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AuthField
                        {...field}
                        ref={(el) => {
                          passwordRef.current = el;
                          field.ref(el);
                        }}
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        disabled={otpPhase}
                        leadingIcon={<Lock />}
                        error={form.formState.errors.password?.message}
                        enterKeyHint="done"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") form.handleSubmit(handleLogin)();
                        }}
                        trailingIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            disabled={otpPhase}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-40 tap-target inline-flex items-center justify-center rounded-xl transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-[18px] w-[18px]" />
                            ) : (
                              <Eye className="h-[18px] w-[18px]" />
                            )}
                          </button>
                        }
                      />
                    </FormControl>
                    <FormMessage className="sr-only" />
                  </FormItem>
                )}
              />
            </div>

            {!otpPhase && (
              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline tap-target inline-flex items-center"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            {otpPhase && (
              <div
                className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 auth-slide-forward"
                aria-live="polite"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/90">
                    Two-Step Verification
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {otpIdentifier}.
                </p>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => setOtp(v)}
                    autoFocus
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className={cn(
                            "h-12 w-10 sm:w-11 rounded-xl border-0 bg-muted/80 text-base font-semibold",
                            "first:rounded-xl last:rounded-xl"
                          )}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpLoading}
                    className="text-[11px] font-bold tracking-[0.1em] uppercase text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
                  >
                    Resend code
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleUseDifferentAccount}
                  className="mt-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground hover:text-primary"
                >
                  ← Use a different account
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold rounded-2xl auth-cta mt-2"
              disabled={isLoading || otpLoading}
            >
              {isLoading || otpLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {otpPhase ? "Verifying…" : "Signing in…"}
                </span>
              ) : otpPhase ? (
                "Verify & Continue"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        {!otpPhase && showGoogleLogin && (
          <>
            <div className="relative my-6" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={googleLoading || isLoading}
              className="w-full h-14 rounded-2xl text-base font-semibold gap-2.5 auth-cta"
            >
              {googleLoading ? (
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5 shrink-0" />
              )}
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </Button>
          </>
        )}

        {!otpPhase && (
          <p className="text-center text-sm text-muted-foreground mt-8 animate-fade-in">
            New to Samaj?{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
}
