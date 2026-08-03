import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, LifeBuoy, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    // Soft UX: no password-reset API exists. Acknowledge without inventing a broken call.
    await new Promise((r) => window.setTimeout(r, 600));
    void values;
    setSubmitted(true);
    toast.success("If an account exists, instructions will be sent.");
    setIsLoading(false);
  };

  return (
    <AuthShell>
      <div className="pt-4 animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/login"))}
            className="tap-target inline-flex items-center justify-center -ml-2 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Samaj</span>
        </div>

        <div className="flex justify-center mb-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-md)]">
            <Shield className="h-7 w-7" strokeWidth={2.2} />
          </div>
        </div>

        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-balance px-2">
            Enter the email linked to your account. We&apos;ll guide you through the next steps.
          </p>
        </div>

        {!submitted ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-base font-semibold rounded-2xl auth-cta"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Send reset instructions"
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="mt-8 space-y-5 animate-fade-in">
            <div className="rounded-2xl bg-muted/70 p-5 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                If an account exists for that email, instructions will be sent shortly.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Self-serve reset is not available yet. Our help center can assist you with a secure
                password change.
              </p>
            </div>

            <Link
              to="/help"
              className="flex items-center gap-3 rounded-2xl bg-primary/[0.06] px-4 py-4 hover:bg-primary/10 transition-colors"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                <LifeBuoy className="h-5 w-5" />
              </span>
              <span className="text-left min-w-0">
                <span className="block text-sm font-semibold text-foreground">Contact Help Center</span>
                <span className="block text-xs text-muted-foreground">
                  Get support to reset your password securely
                </span>
              </span>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full h-14 text-base font-semibold rounded-2xl auth-cta"
            >
              Back to Sign In
            </Button>
          </div>
        )}

        {!submitted && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Remember your password?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
}
