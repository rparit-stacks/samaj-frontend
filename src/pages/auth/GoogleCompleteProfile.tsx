import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { googleApi } from "@/lib/api";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

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

  useEffect(() => {
    if (!authLoading && !state?.tempToken) {
      navigate("/login", { replace: true });
    }
  }, [state, authLoading, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(() => ({ name: state?.name ?? "", phone: "" }), [state?.name]),
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
      <AuthShell footer={null}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
          <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="pt-4 animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
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

        <div className="rounded-2xl bg-muted/60 p-4 flex items-center gap-4">
          {state.picture ? (
            <img
              src={state.picture}
              alt="Google profile"
              className="h-14 w-14 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {(state.name || state.email || "G").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{state.name || "Google User"}</p>
            <p className="text-sm text-muted-foreground truncate">{state.email}</p>
            <div className="mt-1 inline-flex items-center gap-1.5">
              <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium">Signed in with Google</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Just a few more details to set up your Samaj account.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-8 space-y-4" noValidate>
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
                      enterKeyHint="next"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          phoneRef.current?.focus();
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthField
                      {...field}
                      ref={(el) => {
                        phoneRef.current = el;
                        field.ref(el);
                      }}
                      label="Phone (optional)"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      leadingIcon={<Phone />}
                      error={form.formState.errors.phone?.message}
                      enterKeyHint="done"
                    />
                  </FormControl>
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-base font-semibold rounded-2xl auth-cta mt-2"
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
    </AuthShell>
  );
}
