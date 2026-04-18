import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SERVICE_GRID_ITEMS } from "@/lib/serviceGridItems";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export default function Services() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return SERVICE_GRID_ITEMS;
    return SERVICE_GRID_ITEMS.filter((s) => s.label.toLowerCase().includes(t));
  }, [q]);

  return (
    <AppLayout title="Services">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <p className="text-sm text-muted-foreground">
          Open any community service below. Same shortcuts appear on your home dashboard.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter services…"
            className="pl-10 rounded-2xl bg-card border-border/70"
            aria-label="Filter services"
          />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                "flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-border/60 bg-card",
                "hover:bg-muted/50 active:scale-[0.98] transition-all tap-target"
              )}
            >
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", s.color)}>
                <s.icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium text-center text-foreground/90 leading-tight">{s.label}</span>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No services match your search.</p>
        )}
      </div>
    </AppLayout>
  );
}
