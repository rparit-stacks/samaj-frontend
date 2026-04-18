import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { achieversApi, type AchievementMarqueeCardDto } from "@/lib/api";
import { Loader2, Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function MarqueeCard({
  card,
  onOpen,
}: {
  card: AchievementMarqueeCardDto;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      className={cn(
        "flex-shrink-0 w-[260px] sm:w-[280px] rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm",
        "hover:border-primary/40 hover:bg-muted/30 transition-colors tap-target",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 ring-2 ring-background">
          {card.userAvatarUrl ? (
            <img src={card.userAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-primary font-semibold text-sm">
              {(card.userName || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{card.userName}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">{card.headline}</p>
        </div>
        <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0 opacity-80" />
      </div>
    </button>
  );
}

export function AchieversMarquee() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["achievers", "marquee"],
    queryFn: achieversApi.marquee,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading achievers…
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  const loop = [...data, ...data];

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">Community Achievers</h2>
            <p className="text-[11px] text-muted-foreground">Celebrating member milestones</p>
          </div>
        </div>
        <Link
          to="/achievements"
          className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 hover:text-primary/80"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="relative pb-4 overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-card to-transparent" />
        <div className="overflow-hidden">
          <div className="flex gap-3 achievers-marquee-track w-max pr-3">
            {loop.map((card, i) => (
              <MarqueeCard key={`${card.id}-${i}`} card={card} onOpen={(id) => navigate(`/achievements/${id}`)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
