import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, EyeOff, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { googleApi } from "@/lib/api";
import { startGoogleSignIn } from "@/lib/googleBridge";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function UserLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: useMemo(() => ({ email: "", password: "" }), []),
    mode: "onSubmit",
  });

  const handleLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      await login(values.email.trim(), values.password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    startGoogleSignIn(
      async (idToken) => {
        try {
          const result = await googleApi.verifyIdToken(idToken);
          if (result.kind === "login" && result.accessToken) {
            localStorage.setItem("accessToken", result.accessToken);
            if (result.refreshToken) localStorage.setItem("refreshToken", result.refreshToken);
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
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 pt-safe-top">
        <div className="mx-auto w-full max-w-md flex items-center gap-2 px-4 h-14">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
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
        <div className="mx-auto w-full max-w-md px-5 pt-8 pb-8">
          {/* Shield mark */}
          <div className="flex justify-center">
            <div
              className={cn(
                "inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-md)]",
                shake && "animate-vibrate"
              )}
              aria-hidden="true"
            >
              <Shield className="h-7 w-7" strokeWidth={2.2} />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mt-5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your Samaj account
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLogin)}
              className="mt-8 space-y-5"
              noValidate
            >
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/80">
                      Email Address
                    </FormLabel>
                    <div className="relative">
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
                          className="pr-11 h-12 text-base bg-background transition-shadow focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          enterKeyHint="next"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              passwordRef.current?.focus();
                            }
                          }}
                        />
                      </FormControl>
                      <Mail
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
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
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="pr-11 h-12 text-base bg-background transition-shadow focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") form.handleSubmit(handleLogin)();
                          }}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground tap-target inline-flex items-center justify-center rounded-xl transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Forgot */}
              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Login CTA */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium gap-2"
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
          >
            {googleLoading ? (
              <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {googleLoading ? "Connecting…" : "Continue with Google"}
          </Button>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            New to Samaj?{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-muted/30 pb-safe-bottom">
        <div className="mx-auto w-full max-w-md px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary">
            © {new Date().getFullYear()} Suryavanshi Samaj. All rights reserved.
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
