import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  User,
  Lock,
  Phone,
  Building2,
  Users,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
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
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { BrandLogo } from "@/components/BrandLogo";
import { StepProgress } from "@/components/auth/StepProgress";

const TOTAL_STEPS = 4; // before OTP; OTP is step 5 visually

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    memberRole: z.enum(["member", "family", "business"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignupValues = z.infer<typeof signupSchema>;

type MemberRole = SignupValues["memberRole"];

const ROLE_OPTIONS: {
  value: MemberRole;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  { value: "member", label: "Member", description: "Individual community member", icon: Users },
  { value: "family", label: "Family", description: "Representing a family", icon: Building2 },
  { value: "business", label: "Business", description: "Local business listing", icon: Briefcase },
];

const STEP_LABELS = ["You", "Security", "Profile", "Review"];

export default function UserSignup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, completeSession } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: useMemo(
      () => ({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        memberRole: "member",
      }),
      []
    ),
    mode: "onSubmit",
  });

  const goNext = async () => {
    let fields: (keyof SignupValues)[] = [];
    if (step === 1) fields = ["name", "email"];
    if (step === 2) fields = ["password", "confirmPassword"];
    if (step === 3) fields = ["phone", "memberRole"];

    const ok = await form.trigger(fields);
    if (!ok) return;

    setDirection("forward");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    if (otpPhase) {
      setOtpPhase(false);
      setOtp("");
      setDirection("back");
      setAnimKey((k) => k + 1);
      return;
    }
    if (step <= 1) {
      navigate("/login");
      return;
    }
    setDirection("back");
    setAnimKey((k) => k + 1);
    setStep((s) => s - 1);
  };

  const registerAccount = async () => {
    const values = form.getValues();
    setIsLoading(true);
    try {
      await authApi.register({
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
      });
      toast.success("Verification code sent. Check your email.");
      setDirection("forward");
      setAnimKey((k) => k + 1);
      setOtpPhase(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndFinish = async () => {
    const values = form.getValues();
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

      try {
        await authApi.updateProfile({
          name: values.name.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          metadata: {
            memberRole: values.memberRole,
          },
        });
      } catch {
        // ignore profile update error — account still created
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
      <AuthShell footer={null}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="h-1.5 w-24 rounded-full skeleton-shimmer" />
        </div>
      </AuthShell>
    );
  }

  const busy = isLoading || otpLoading;
  const values = form.watch();
  const progressCurrent = otpPhase ? TOTAL_STEPS : step;

  return (
    <AuthShell>
      <div className="pt-4">
        <div className="flex items-center gap-2.5 mb-5">
          <button
            type="button"
            onClick={goBack}
            className="tap-target inline-flex items-center justify-center -ml-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BrandLogo className="h-8 w-8" rounded="xl" />
          <span className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Samaj</span>
        </div>

        <StepProgress
          steps={TOTAL_STEPS}
          current={progressCurrent}
          labels={STEP_LABELS}
          className="mb-6"
        />

        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {otpPhase
              ? "Verify email"
              : step === 1
                ? "Join Samaj"
                : step === 2
                  ? "Secure account"
                  : step === 3
                    ? "About you"
                    : "Almost there"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {otpPhase
              ? `Enter the code we sent to ${values.email}`
              : step === 1
                ? "Tell us who you are to get started."
                : step === 2
                  ? "Choose a strong password you'll remember."
                  : step === 3
                    ? "Optional details help personalize your experience."
                    : "Review your details and create your account."}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (otpPhase) {
                void verifyAndFinish();
                return;
              }
              if (step < TOTAL_STEPS) {
                void goNext();
                return;
              }
              void registerAccount();
            }}
            noValidate
          >
            <div
              key={animKey}
              className={cn(
                "space-y-4",
                direction === "forward" ? "auth-slide-forward" : "auth-slide-back"
              )}
            >
              {/* Step 1: Name + Email */}
              {!otpPhase && step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AuthField
                            {...field}
                            label="Full Name"
                            autoComplete="name"
                            placeholder="Your name"
                            leadingIcon={<User />}
                            error={form.formState.errors.name?.message}
                          />
                        </FormControl>
                        <FormMessage className="sr-only" />
                      </FormItem>
                    )}
                  />
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
                            leadingIcon={<Mail />}
                            error={form.formState.errors.email?.message}
                          />
                        </FormControl>
                        <FormMessage className="sr-only" />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Step 2: Password */}
              {!otpPhase && step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AuthField
                            {...field}
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            leadingIcon={<Lock />}
                            error={form.formState.errors.password?.message}
                            trailingIcon={
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center rounded-xl"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={-1}
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
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AuthField
                            {...field}
                            label="Confirm Password"
                            type={showConfirm ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Repeat password"
                            leadingIcon={<Lock />}
                            error={form.formState.errors.confirmPassword?.message}
                            trailingIcon={
                              <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center rounded-xl"
                                aria-label={showConfirm ? "Hide password" : "Show password"}
                                tabIndex={-1}
                              >
                                {showConfirm ? (
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
                </>
              )}

              {/* Step 3: Phone + role */}
              {!otpPhase && step === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AuthField
                            {...field}
                            label="Phone (optional)"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+91 98765 43210"
                            leadingIcon={<Phone />}
                            error={form.formState.errors.phone?.message}
                          />
                        </FormControl>
                        <FormMessage className="sr-only" />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground/70">
                      I am joining as
                    </p>
                    <div className="grid gap-2">
                      {ROLE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const selected = values.memberRole === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => form.setValue("memberRole", opt.value, { shouldValidate: true })}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all",
                              "border-0 bg-muted/80 hover:bg-muted",
                              selected && "ring-2 ring-primary/40 bg-primary/[0.06]"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                                selected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">
                                {opt.label}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {opt.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Review */}
              {!otpPhase && step === 4 && (
                <div className="rounded-2xl bg-muted/60 p-5 space-y-3">
                  <ReviewRow label="Name" value={values.name} />
                  <ReviewRow label="Email" value={values.email} />
                  <ReviewRow
                    label="Phone"
                    value={values.phone?.trim() ? values.phone : "Not provided"}
                  />
                  <ReviewRow
                    label="Joining as"
                    value={
                      ROLE_OPTIONS.find((r) => r.value === values.memberRole)?.label ?? "Member"
                    }
                  />
                  <p className="pt-2 text-xs text-muted-foreground leading-relaxed">
                    By creating an account you agree to our{" "}
                    <Link to="/terms" className="text-primary font-medium hover:underline">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary font-medium hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* Step 5: OTP */}
              {otpPhase && (
                <div
                  className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/90">
                      Identity Verification
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Enter the 6-digit code sent to {values.email}.
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-3">
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
                      disabled={busy}
                      className="text-[11px] font-bold tracking-[0.1em] uppercase text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              {(step > 1 || otpPhase) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={busy}
                  className="h-14 flex-1 rounded-2xl text-base font-semibold auth-cta"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="h-14 flex-[1.4] rounded-2xl text-base font-semibold auth-cta"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {otpPhase ? "Verifying…" : step === TOTAL_STEPS ? "Creating…" : "Please wait…"}
                  </span>
                ) : otpPhase ? (
                  "Verify & Create"
                ) : step === TOTAL_STEPS ? (
                  "Create Account"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {!otpPhase && step === 1 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground text-right break-all">{value}</span>
    </div>
  );
}
