import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /^[+\d][\d\s-]{6,}$/.test(v),
        "Enter a valid phone number"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignupValues = z.infer<typeof signupSchema>;

export default function UserSignup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, completeSession } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: useMemo(
      () => ({ name: "", email: "", phone: "", password: "", confirmPassword: "" }),
      []
    ),
    mode: "onSubmit",
  });

  const sendOtp = async () => {
    const values = form.getValues();
    setIsLoading(true);
    try {
      await authApi.register({
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
      });
      toast.success("Verification code sent. Check your email.");
      setOtpPhase(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: SignupValues) => {
    if (!otpPhase) {
      await sendOtp();
      return;
    }
    // OTP phase: verify + finalize
    const code = otp.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit verification code");
      return;
    }
    const email = values.email.trim().toLowerCase();
    setOtpLoading(true);
    try {
      const auth = await authApi.verifyOtp({
        identifier: email,
        code,
        purpose: "REGISTRATION",
      });
      completeSession(auth);

      if (values.name.trim() || values.phone?.trim()) {
        try {
          await authApi.updateProfile({
            name: values.name.trim() || undefined,
            phone: values.phone?.trim() || undefined,
          });
        } catch {
          // ignore profile update error — account still created
        }
      }

      toast.success("Account created. Welcome!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const email = form.getValues("email").trim();
    if (!email) {
      toast.error("Email is required");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.sendOtp({
        identifier: email,
        type: "EMAIL",
        purpose: "REGISTRATION",
      });
      toast.success("Verification code resent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const busy = isLoading || otpLoading;

  return (
    <div className="min-h-dvh flex flex-col bg-muted/40">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 pt-safe-top">
        <div className="mx-auto w-full max-w-md flex items-center gap-2 px-4 h-14">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/login"))}
            className="tap-target inline-flex items-center justify-center -ml-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-[0.18em] text-primary uppercase">
            Samaj
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-md px-4 sm:px-5 py-5 space-y-4">
          {/* Form card */}
          <div className="rounded-2xl bg-background border border-border/60 shadow-[var(--shadow-md)] p-5 sm:p-6">
            <div>
              <h1 className="text-[28px] leading-tight font-bold tracking-tight text-foreground">
                Create Account
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Join the Samaj community for news, events &amp; more.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="mt-6 space-y-4"
                noValidate
              >
                {/* Full name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="name"
                          placeholder="Your name"
                          className="h-11 text-base bg-background focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          enterKeyHint="next"
                          disabled={otpPhase}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              emailRef.current?.focus();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={(el) => {
                            emailRef.current = el;
                            field.ref(el);
                          }}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="h-11 text-base bg-background focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          enterKeyHint="next"
                          disabled={otpPhase}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              phoneRef.current?.focus();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={(el) => {
                            phoneRef.current = el;
                            field.ref(el);
                          }}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+91 98765 43210"
                          className="h-11 text-base bg-background focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          enterKeyHint="next"
                          disabled={otpPhase}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              passwordRef.current?.focus();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password + Confirm */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                          Password
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              {...field}
                              ref={(el) => {
                                passwordRef.current = el;
                                field.ref(el);
                              }}
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="••••••••"
                              className="h-11 text-base bg-background pr-10 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                              enterKeyHint="next"
                              disabled={otpPhase}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  confirmRef.current?.focus();
                                }
                              }}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center rounded-lg"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                          Confirm
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              {...field}
                              ref={(el) => {
                                confirmRef.current = el;
                                field.ref(el);
                              }}
                              type={showConfirm ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="••••••••"
                              className="h-11 text-base bg-background pr-10 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                              enterKeyHint="done"
                              disabled={otpPhase}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center rounded-lg"
                            aria-label={showConfirm ? "Hide password" : "Show password"}
                            tabIndex={-1}
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Identity Verification */}
                <div
                  className={cn(
                    "mt-2 rounded-xl border p-4 transition-all",
                    otpPhase
                      ? "border-primary/20 bg-primary/[0.04]"
                      : "border-border/60 bg-muted/40 opacity-80"
                  )}
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/90">
                      Identity Verification
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {otpPhase
                      ? `Enter the 6-digit code sent to ${form.getValues("email") || "your email"}.`
                      : "A 6-digit code will be sent to your email after you tap Sign Up."}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(v) => setOtp(v)}
                      disabled={!otpPhase}
                      containerClassName="gap-1.5"
                    >
                      <InputOTPGroup className="gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className={cn(
                              "h-10 w-9 sm:w-10 rounded-md border border-input bg-background text-sm font-semibold",
                              "first:rounded-md last:rounded-md"
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!otpPhase || busy}
                      className="text-[11px] font-bold tracking-[0.1em] uppercase text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline shrink-0"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold tracking-[0.14em] uppercase"
                  disabled={busy}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {otpPhase ? "Verifying…" : "Sending code…"}
                    </span>
                  ) : otpPhase ? (
                    "Verify & Create"
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-bold tracking-[0.08em] uppercase hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>

          {/* Promo strip */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-primary text-white p-5 shadow-[var(--shadow-md)]">
            <div className="absolute inset-0 opacity-25" aria-hidden="true">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-black/20 blur-2xl" />
            </div>
            <div className="relative flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 ring-1 ring-white/25 shrink-0">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-tight">
                  End-to-end encryption for your data.
                </h3>
                <p className="mt-1 text-xs text-white/80 leading-relaxed">
                  Your personal information is secured and never shared without consent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-background pb-safe-bottom">
        <div className="mx-auto w-full max-w-md px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            <span className="text-primary font-bold tracking-[0.18em]">Samaj</span>{" "}
            &nbsp;© {new Date().getFullYear()} Suryavanshi Samaj. All rights reserved.
          </p>
          <div className="mt-3 flex items-start gap-6 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary leading-tight">
              Privacy
              <br />
              Policy
            </Link>
            <Link to="/terms" className="hover:text-primary leading-tight">
              Terms of
              <br />
              Service
            </Link>
            <Link to="/help" className="hover:text-primary leading-tight">
              Help
              <br />
              Center
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
