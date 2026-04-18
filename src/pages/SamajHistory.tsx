import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { samajHistoryApi, type HistoryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BookOpen, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TYPE_PRESETS = [
  "FOUNDING",
  "MILESTONE",
  "ELECTION",
  "EVENT",
  "AWARD",
  "RENOVATION",
  "CULTURAL",
  "SOCIAL",
  "OTHER",
];

const ALL_TYPES = "__all__";

function formatDate(d: string) {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function SamajHistory() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const listQuery = useQuery({
    queryKey: ["samaj-history", page, typeFilter, q, fromDate, toDate],
    queryFn: () =>
      samajHistoryApi.list({
        page,
        size: 15,
        type: typeFilter === ALL_TYPES ? undefined : typeFilter,
        q: q.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  const items = listQuery.data?.content ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <AppLayout title="Samaj History">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 pb-12">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Samaj History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Milestones, events, and moments documented by your administrators.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search title, location, description…"
              className="pl-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES}>All types</SelectItem>
                  {TYPE_PRESETS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} className="rounded-xl h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} className="rounded-xl h-10" />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No entries match your filters.</p>
        ) : (
          <div className="space-y-3">
            {items.map((h) => (
              <HistoryCard key={h.id} h={h} onOpen={() => navigate(`/history/${h.id}`)} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {(listQuery.data?.number ?? 0) + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-full" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function HistoryCard({ h, onOpen }: { h: HistoryDto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left rounded-2xl border border-border/60 bg-card overflow-hidden",
        "hover:border-primary/30 hover:bg-muted/20 transition-colors tap-target",
      )}
    >
      <div className="flex gap-0 sm:gap-4">
        {h.imageUrl ? (
          <div className="w-28 sm:w-36 shrink-0 self-stretch min-h-[100px] bg-muted">
            <img src={h.imageUrl} alt="" className="h-full w-full object-cover min-h-[100px]" />
          </div>
        ) : (
          <div className="w-14 sm:w-20 shrink-0 bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary/70" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-3 sm:p-4 pr-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {h.type}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(h.date)}{h.time ? ` · ${h.time}` : ""}</span>
          </div>
          <h2 className="font-semibold text-foreground leading-snug line-clamp-2">{h.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{h.location}</p>
          {h.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{h.description}</p>}
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary mt-2">
            Read more <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
