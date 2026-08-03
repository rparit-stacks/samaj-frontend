import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Newspaper, Users, ShieldAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/AuthShell";
import { BrandLogo } from "@/components/BrandLogo";

const ONBOARDING_KEY = "samaj_onboarding_done";

const SLIDES = [
  {
    icon: Newspaper,
    title: "Stay connected with community news",
    body: "Read trusted updates, announcements, and stories from Suryavanshi Samaj — all in one place.",
    accent: "from-primary/15 to-secondary/10",
  },
  {
    icon: Users,
    title: "Discover members & matrimony",
    body: "Browse the directory, find families nearby, and explore matrimony profiles with privacy you control.",
    accent: "from-secondary/20 to-primary/10",
  },
  {
    icon: ShieldAlert,
    title: "Events & emergency support",
    body: "Never miss a gathering. When help is needed, reach your community fast with emergency alerts.",
    accent: "from-primary/20 to-accent/10",
  },
] as const;

function markDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    markDone();
    navigate("/login", { replace: true });
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setDirection("forward");
    setAnimKey((k) => k + 1);
    setIndex((i) => i + 1);
  };

  const prev = () => {
    if (index === 0) return;
    setDirection("back");
    setAnimKey((k) => k + 1);
    setIndex((i) => i - 1);
  };

  return (
    <AuthShell footer={null}>
      <div className="flex flex-col min-h-[calc(100dvh-2rem)] pt-4 pb-safe-bottom">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <BrandLogo className="h-8 w-8" rounded="xl" />
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Samaj</span>
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-sm font-semibold text-muted-foreground hover:text-primary tap-target px-2"
          >
            Skip
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8">
          <div
            key={animKey}
            className={cn(
              "text-center",
              direction === "forward" ? "auth-slide-forward" : "auth-slide-back"
            )}
          >
            <div
              className={cn(
                "mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br",
                slide.accent
              )}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-lg)]">
                <Icon className="h-9 w-9" strokeWidth={2} />
              </div>
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground text-balance px-2">
              {slide.title}
            </h1>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed px-4 text-balance">
              {slide.body}
            </p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDirection(i > index ? "forward" : "back");
                  setAnimKey((k) => k + 1);
                  setIndex(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-7 bg-primary" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pb-6">
          {index > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              className="h-14 flex-1 rounded-2xl text-base font-semibold auth-cta"
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={next}
            className={cn(
              "h-14 rounded-2xl text-base font-semibold auth-cta gap-1.5",
              index > 0 ? "flex-[1.4]" : "w-full"
            )}
          >
            {isLast ? "Get Started" : "Next"}
            {!isLast && <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
