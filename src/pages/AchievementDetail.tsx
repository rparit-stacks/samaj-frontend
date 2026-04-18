import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { achieversApi, type AchievementFieldItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ExternalLink, Trophy } from "lucide-react";

function FieldBlock({ f }: { f: AchievementFieldItem }) {
  const label = f.label || "Field";
  switch (f.type) {
    case "LONG_TEXT":
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{f.value}</p>
        </div>
      );
    case "DATE":
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm text-foreground">{f.value ? new Date(f.value).toLocaleDateString("en-IN") : "—"}</p>
        </div>
      );
    case "LINK":
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          {f.value ? (
            <a
              href={f.value}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary inline-flex items-center gap-1 break-all"
            >
              {f.value} <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      );
    case "IMAGE":
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          {f.value ? (
            <img src={f.value} alt={label} className="max-h-64 rounded-xl border object-contain bg-muted/30" />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      );
    default:
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm text-foreground">{f.value || "—"}</p>
        </div>
      );
  }
}

export default function AchievementDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["achievers", "detail", id],
    queryFn: () => achieversApi.get(id!),
    enabled: !!id,
  });

  return (
    <AppLayout title="Achievement">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2 text-muted-foreground">
          <Link to="/achievements">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        {isLoading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-destructive py-8">
            {(error as Error).message || "Could not load achievement."}
          </p>
        )}

        {data && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                  {data.userAvatarUrl ? (
                    <img src={data.userAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-primary font-bold">
                      {(data.userName || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Trophy className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <h1 className="text-lg font-bold text-foreground leading-snug">{data.headline}</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {data.userProfileKey ? (
                      <Link
                        to={`/profile/${encodeURIComponent(data.userProfileKey)}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {data.userName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-foreground">{data.userName}</span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        data.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : data.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-800"
                            : "bg-red-500/10 text-red-700"
                      }`}
                    >
                      {data.status}
                    </span>
                  </div>
                  {data.status === "REJECTED" && data.rejectionReason && (
                    <p className="text-xs text-destructive mt-2 bg-destructive/5 rounded-lg px-3 py-2">
                      {data.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Details</h2>
              <div className="space-y-5 divide-y divide-border/50">
                {data.fields.map((f) => (
                  <div key={f.id} className="pt-4 first:pt-0">
                    <FieldBlock f={f} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
