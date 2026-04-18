import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { samajHistoryApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BookOpen, MapPin, Calendar } from "lucide-react";

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function SamajHistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number.parseInt(id, 10) : NaN;

  const { data, isLoading, error } = useQuery({
    queryKey: ["samaj-history", "detail", numericId],
    queryFn: () => samajHistoryApi.get(numericId),
    enabled: Number.isFinite(numericId),
  });

  return (
    <AppLayout title="History">
      <div className="max-w-2xl mx-auto pb-12">
        <div className="p-4 md:p-6 space-y-4">
          <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2 text-muted-foreground">
            <Link to="/history">
              <ArrowLeft className="h-4 w-4" />
              Back to timeline
            </Link>
          </Button>

          {!Number.isFinite(numericId) && (
            <p className="text-sm text-destructive">Invalid link.</p>
          )}

          {isLoading && (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center py-8">{(error as Error).message}</p>
          )}

          {data && (
            <article className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              {data.imageUrl && (
                <div className="w-full aspect-[21/9] max-h-56 bg-muted">
                  <img src={data.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {data.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(data.date)}
                    {data.time ? ` · ${data.time}` : ""}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">{data.title}</h1>
                <p className="text-sm text-muted-foreground inline-flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {data.location}
                </p>
                {data.description && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Samaj community record</span>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
