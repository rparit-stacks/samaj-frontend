import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { googleApi } from "@/lib/api";
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

interface LocationState {
  tempToken?: string;
  email?: string;
  name?: string;
  picture?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number"),
});

type FormValues = z.infer<typeof schema>;

export default function GoogleCompleteProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeSession, isAuthenticated, isLoading: authLoading } = useAuth();
  const state = location.state as LocationState | null;
  const [isLoading, setIsLoading] = useState(false);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  // If no state (direct navigation), send back to login
  useEffect(() => {
    if (!authLoading && !state?.tempToken) {
      navigate("/login", { replace: true });
    }
  }, [state, authLoading, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(
      () => ({ name: state?.name ?? "", phone: "" }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    ),
    mode: "onSubmit",
  });

  const handleSubmit = async (values: FormValues) => {
    if (!state?.tempToken) return;
    setIsLoading(true);
    try {
      const auth = await googleApi.completeSignup({
        tempToken: state.tempToken,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
      });
      completeSession(auth);
      toast.success("Welcome to Samaj!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !state?.tempToken) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-muted/40">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 pt-safe-top">
        <div className="mx-auto w-full max-w-md flex items-center gap-2 px-4 h-14">
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="tap-target inline-flex items-center justify-center -ml-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Samaj</span>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-md px-4 sm:px-5 py-8 space-y-5">
          {/* Google account card */}
          <div className="rounded-2xl bg-background border border-border/60 shadow-[var(--shadow-md)] p-5">
            <div className="flex items-center gap-4">
              {state.picture ? (
                <img
                  src={state.picture}
                  alt="Google profile"
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {(state.name || state.email || "G").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{state.name || "Google User"}</p>
                <p className="text-sm text-muted-foreground truncate">{state.email}</p>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-[11px] text-muted-foreground font-medium">Signed in with Google</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl bg-background border border-border/60 shadow-[var(--shadow-md)] p-5 sm:p-6">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-foreground">
              Complete Your Profile
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Just a few more details to set up your Samaj account.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-4" noValidate>
                {/* Name */}
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
                        Phone Number{" "}
                        <span className="text-muted-foreground normal-case font-normal">(optional)</span>
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
                          enterKeyHint="done"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold tracking-[0.14em] uppercase"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    "Join Samaj"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
