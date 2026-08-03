import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Phone,
  AlertTriangle,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Eye,
  Users,
  Pencil,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
  UserCheck,
  ExternalLink,
  Search,
  X,
  Siren,
} from "lucide-react";
import {
  emergencyApi,
  type EmergencyItem,
  type EmergencyHelpItem,
  type EmergencyStatus,
  type DashboardStats,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  EmergencyStatus,
  { label: string; chip: string; dot: string }
> = {
  OPEN: {
    label: "Active",
    chip: "bg-red-500/15 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  IN_PROGRESS: {
    label: "In progress",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  HELP_RECEIVED: {
    label: "Help received",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  RESOLVED: {
    label: "Resolved",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  CLOSED: {
    label: "Closed",
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

const TYPE_LABELS: Record<string, string> = {
  MEDICAL: "Medical",
  ACCIDENT: "Accident",
  FINANCIAL: "Financial",
  BLOOD: "Blood",
  OTHER: "Other",
};

function locationString(e: EmergencyItem): string {
  if (e.city) {
    return [e.area, e.city, e.state, e.country].filter(Boolean).join(", ");
  }
  return e.locationDescription ?? "Location not specified";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Scope = "feed" | "mine";

export default function Emergency() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const myUserId = user?.id ?? "";

  const [allEmergencies, setAllEmergencies] = useState<EmergencyItem[]>([]);
  const [myEmergencies, setMyEmergencies] = useState<EmergencyItem[]>([]);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [scope, setScope] = useState<Scope>("feed");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCity, setFilterCity] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "urgent">("urgent");

  const [editingEmergency, setEditingEmergency] = useState<EmergencyItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    area: "",
    city: "",
    state: "",
    country: "",
    landmark: "",
    contactPhone: "",
    contactWhatsapp: "",
    contactEmail: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const [resolvingEmergency, setResolvingEmergency] = useState<EmergencyItem | null>(null);
  const [resolveExternal, setResolveExternal] = useState(false);
  const [resolveHelperUserId, setResolveHelperUserId] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [resolveSaving, setResolveSaving] = useState(false);

  const [helpersFor, setHelpersFor] = useState<EmergencyItem | null>(null);
  const [helpers, setHelpers] = useState<EmergencyHelpItem[]>([]);
  const [helpersLoading, setHelpersLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [emergencyDetailOpen, setEmergencyDetailOpen] = useState(false);
  const [emergencyDetail, setEmergencyDetail] = useState<EmergencyItem | null>(null);

  const emergencyIdFromQuery = searchParams.get("emergencyId");
  useEffect(() => {
    if (!emergencyIdFromQuery) return;
    const id = Number(emergencyIdFromQuery);
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    emergencyApi
      .getById(id)
      .then((data) => {
        if (cancelled) return;
        setEmergencyDetail(data);
        setEmergencyDetailOpen(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast({
          title: "Could not open emergency",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [emergencyIdFromQuery, toast]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [all, mine, stats] = await Promise.all([
        emergencyApi.listAll(),
        emergencyApi.listMine(),
        emergencyApi.getDashboardStats(),
      ]);
      setAllEmergencies(all);
      setMyEmergencies(mine);
      setDashStats(stats);
    } catch (err: unknown) {
      toast({
        title: "Failed to load emergencies",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const myActiveCount = myEmergencies.filter(
    (e) => e.status === "OPEN" || e.status === "IN_PROGRESS" || e.status === "HELP_RECEIVED",
  ).length;

  const visibleList = useMemo(() => {
    let list =
      scope === "mine"
        ? [...myEmergencies]
        : allEmergencies.filter((e) => e.status !== "CANCELLED");

    if (filterType !== "ALL") list = list.filter((e) => e.type === filterType);
    if (filterCity.trim()) {
      const q = filterCity.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.city?.toLowerCase().includes(q) ||
          e.area?.toLowerCase().includes(q) ||
          e.state?.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      const order: Record<string, number> = {
        OPEN: 0,
        IN_PROGRESS: 1,
        HELP_RECEIVED: 2,
        RESOLVED: 3,
        CLOSED: 4,
        CANCELLED: 5,
      };
      const diff = (order[a.status] ?? 5) - (order[b.status] ?? 5);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [scope, myEmergencies, allEmergencies, filterType, filterCity, sortBy]);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleTrackView = async (id: number) => {
    try {
      await emergencyApi.trackView(id);
    } catch {
      /* silent */
    }
  };

  const handleContactClick = async (id: number) => {
    try {
      await emergencyApi.trackContactClick(id);
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this emergency?")) return;
    try {
      setDeletingId(id);
      await emergencyApi.delete(id);
      toast({ title: "Emergency deleted" });
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (e: EmergencyItem) => {
    setEditingEmergency(e);
    setEditForm({
      title: e.title,
      description: e.description,
      area: e.area ?? "",
      city: e.city ?? "",
      state: e.state ?? "",
      country: e.country ?? "",
      landmark: e.landmark ?? "",
      contactPhone: e.contactPreferences.phone ?? "",
      contactWhatsapp: e.contactPreferences.whatsapp ?? "",
      contactEmail: e.contactPreferences.email ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editingEmergency) return;
    try {
      setEditSaving(true);
      await emergencyApi.update(editingEmergency.id, {
        title: editForm.title,
        description: editForm.description,
        area: editForm.area || undefined,
        city: editForm.city || undefined,
        state: editForm.state || undefined,
        country: editForm.country || undefined,
        landmark: editForm.landmark || undefined,
        contactPhone: editForm.contactPhone || undefined,
        contactWhatsapp: editForm.contactWhatsapp || undefined,
        contactEmail: editForm.contactEmail || undefined,
        allowPhone: !!editForm.contactPhone,
        allowWhatsapp: !!editForm.contactWhatsapp,
        allowEmail: !!editForm.contactEmail,
      });
      toast({ title: "Emergency updated" });
      setEditingEmergency(null);
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Failed to update",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const openResolve = (e: EmergencyItem) => {
    setResolvingEmergency(e);
    setResolveExternal(false);
    setResolveHelperUserId("");
    setResolveNote("");
  };

  const handleResolve = async () => {
    if (!resolvingEmergency) return;
    if (!resolveExternal && !resolveHelperUserId.trim()) {
      toast({
        title: "Select a helper",
        description: "Enter helper User ID or mark as outside person.",
        variant: "destructive",
      });
      return;
    }
    try {
      setResolveSaving(true);
      await emergencyApi.resolve(resolvingEmergency.id, {
        helperUserId: resolveExternal ? undefined : resolveHelperUserId.trim(),
        externalHelper: resolveExternal,
        externalHelperNote: resolveExternal ? resolveNote : undefined,
        note: resolveExternal ? undefined : resolveNote,
      });
      toast({ title: "Marked resolved" });
      setResolvingEmergency(null);
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Failed to resolve",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setResolveSaving(false);
    }
  };

  const openHelpers = async (emergency: EmergencyItem) => {
    try {
      setHelpersFor(emergency);
      setHelpersLoading(true);
      setHelpers(await emergencyApi.getHelpers(emergency.id));
    } catch (err: unknown) {
      toast({
        title: "Failed to load helpers",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setHelpersLoading(false);
    }
  };

  const renderCard = (e: EmergencyItem) => {
    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.OPEN;
    const isExpanded = expandedId === e.id;
    const isOwner = e.creatorUserId === myUserId;
    const isActive = e.status === "OPEN" || e.status === "IN_PROGRESS" || e.status === "HELP_RECEIVED";

    return (
      <article
        key={e.id}
        className={cn(
          "overflow-hidden rounded-2xl border bg-card transition-shadow",
          isActive ? "border-red-500/25 shadow-[0_8px_30px_-18px_rgba(220,38,38,0.55)]" : "border-border/60",
        )}
      >
        <button
          type="button"
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
          onClick={() => {
            toggleExpand(e.id);
            void handleTrackView(e.id);
          }}
        >
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isActive ? "bg-red-600 text-white" : "bg-muted text-muted-foreground",
            )}
          >
            <Siren className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-tight">
                {e.title}
              </h3>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.chip)}>
                {cfg.label}
              </span>
            </div>

            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {e.description}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                {TYPE_LABELS[e.type] ?? e.type}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {e.city ?? "N/A"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(e.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {e.viewCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {e.helperCount}
              </span>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-3 border-t border-border/50 px-4 py-3.5">
            <p className="whitespace-pre-line text-sm leading-relaxed">{e.description}</p>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{locationString(e)}</span>
              </div>
              {e.landmark && <p className="pl-5">Landmark: {e.landmark}</p>}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Emergency at {new Date(e.emergencyAt).toLocaleString()}
              </div>
              {(e.creatorDisplayName || e.creatorPhotoUrl) && (
                <Link
                  to={`/user/${e.creatorUserId}`}
                  className="inline-flex items-center gap-2 pt-1 text-sm font-medium text-foreground hover:underline"
                >
                  {e.creatorPhotoUrl && (
                    <img src={e.creatorPhotoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  )}
                  {e.creatorDisplayName ?? "Samaj Member"}
                </Link>
              )}
            </div>

            {isActive && (
              <div className="flex flex-wrap gap-2">
                {e.contactPreferences.phone && (
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 rounded-full bg-red-600 text-white hover:bg-red-700"
                    asChild
                    onClick={() => void handleContactClick(e.id)}
                  >
                    <a href={`tel:${e.contactPreferences.phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </a>
                  </Button>
                )}
                {e.contactPreferences.whatsapp && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-full border-emerald-600/40 text-emerald-700"
                    asChild
                    onClick={() => void handleContactClick(e.id)}
                  >
                    <a
                      href={`https://wa.me/${e.contactPreferences.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        `Hi, I saw your emergency on Samaj.\nI want to help you.\nEmergency ID: ${e.id}\nTitle: ${e.title}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                {e.contactPreferences.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-full"
                    asChild
                    onClick={() => void handleContactClick(e.id)}
                  >
                    <a
                      href={`mailto:${e.contactPreferences.email}?subject=Emergency Help - ${e.title}&body=Hi, I saw your emergency (ID: ${e.id}) on Samaj and I want to help.`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 rounded-full px-2 text-xs text-muted-foreground"
              onClick={() => void openHelpers(e)}
            >
              <Users className="h-3.5 w-3.5" />
              Helpers ({e.helperCount})
            </Button>

            {isOwner && isActive && (
              <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-full" onClick={() => openEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-full text-red-600"
                  disabled={deletingId === e.id}
                  onClick={() => void handleDelete(e.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === e.id ? "Deleting…" : "Delete"}
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => openResolve(e)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve
                </Button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <AppLayout title="Emergency">
      <div className="mx-auto max-w-lg pb-8">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/50 px-4 pb-5 pt-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 100% 0%, hsl(0 85% 45% / 0.14), transparent 55%), radial-gradient(ellipse 70% 60% at 0% 100%, hsl(345 65% 30% / 0.08), transparent 50%)",
            }}
          />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600/80">
                  Community SOS
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">Emergency Center</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real help from your samaj — fast and local.
                </p>
              </div>
              <Button
                className="h-11 shrink-0 gap-2 rounded-full bg-red-600 px-4 font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700"
                onClick={() => navigate("/emergency/create")}
              >
                <Plus className="h-4 w-4" />
                Report
              </Button>
            </div>

            {/* Mini stats — replaces Dashboard tab */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Active", value: dashStats?.activeEmergencies ?? 0, tone: "text-red-600" },
                { label: "Mine", value: myActiveCount, tone: "text-amber-600" },
                { label: "Helped", value: dashStats?.totalPeopleHelped ?? 0, tone: "text-emerald-600" },
                { label: "Views", value: dashStats?.totalViews ?? 0, tone: "text-sky-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/50 bg-background/80 px-2 py-2.5 text-center backdrop-blur">
                  <p className={cn("text-lg font-bold tabular-nums leading-none", s.tone)}>{s.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scope pills — replaces Tabs */}
        <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-full bg-muted/70 p-1">
              <button
                type="button"
                onClick={() => setScope("feed")}
                className={cn(
                  "flex-1 rounded-full py-2 text-xs font-semibold transition-colors",
                  scope === "feed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Community feed
              </button>
              <button
                type="button"
                onClick={() => setScope("mine")}
                className={cn(
                  "relative flex-1 rounded-full py-2 text-xs font-semibold transition-colors",
                  scope === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                My posts
                {myActiveCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                    {myActiveCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-auto min-w-[7rem] rounded-full border-border/60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="MEDICAL">Medical</SelectItem>
                <SelectItem value="ACCIDENT">Accident</SelectItem>
                <SelectItem value="FINANCIAL">Financial</SelectItem>
                <SelectItem value="BLOOD">Blood</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-auto rounded-full border-border/60 text-xs">
                <ArrowUpDown className="mr-1 h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Most urgent</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 rounded-full border-border/60 pl-8 pr-8 text-xs"
                placeholder="City / area"
                value={filterCity}
                onChange={(ev) => setFilterCity(ev.target.value)}
              />
              {filterCity && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setFilterCity("")}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 px-3 pt-3">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : visibleList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">
                  {scope === "mine" ? "No emergencies posted yet" : "No emergencies found"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {scope === "mine"
                    ? "If you need help, report an emergency to the community."
                    : "Try clearing filters or check back later."}
                </p>
              </div>
              {scope === "mine" && (
                <Button
                  className="mt-1 gap-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  onClick={() => navigate("/emergency/create")}
                >
                  <Plus className="h-4 w-4" />
                  Report emergency
                </Button>
              )}
            </div>
          ) : (
            visibleList.map((e) => renderCard(e))
          )}
        </div>

        <div className="mx-3 mt-5 rounded-2xl border border-border/50 bg-muted/30 px-4 py-4">
          <h3 className="text-sm font-semibold">Before you post</h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>• For medical emergencies, call 108 first.</li>
            <li>• Only post genuine, time-sensitive needs.</li>
            <li>• Keep location and contact details accurate.</li>
            <li>• Mark resolved once help is received.</li>
          </ul>
        </div>
      </div>

      {/* Edit */}
      <Dialog open={!!editingEmergency} onOpenChange={(open) => !open && setEditingEmergency(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit emergency</DialogTitle>
            <DialogDescription>Update details of your SOS post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={editForm.title} onChange={(ev) => setEditForm((f) => ({ ...f, title: ev.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(ev) => setEditForm((f) => ({ ...f, description: ev.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["area", "city", "state", "country"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key}</Label>
                  <Input
                    value={editForm[key]}
                    onChange={(ev) => setEditForm((f) => ({ ...f, [key]: ev.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Landmark</Label>
              <Input
                value={editForm.landmark}
                onChange={(ev) => setEditForm((f) => ({ ...f, landmark: ev.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ["contactPhone", "Phone"],
                  ["contactWhatsapp", "WhatsApp"],
                  ["contactEmail", "Email"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={editForm[key]}
                    onChange={(ev) => setEditForm((f) => ({ ...f, [key]: ev.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingEmergency(null)}>
                Cancel
              </Button>
              <Button onClick={() => void handleEditSave()} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail from search */}
      <Dialog
        open={emergencyDetailOpen}
        onOpenChange={(open) => {
          setEmergencyDetailOpen(open);
          if (!open) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete("emergencyId");
              return next;
            });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emergency details</DialogTitle>
            <DialogDescription>{emergencyDetail?.title ?? "Loading…"}</DialogDescription>
          </DialogHeader>
          {emergencyDetail ? (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge variant="outline">{TYPE_LABELS[emergencyDetail.type] ?? emergencyDetail.type}</Badge>
                <Badge className={STATUS_CONFIG[emergencyDetail.status]?.chip}>
                  {STATUS_CONFIG[emergencyDetail.status]?.label}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap">{emergencyDetail.description}</p>
              <p className="text-muted-foreground">{locationString(emergencyDetail)}</p>
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve */}
      <Dialog open={!!resolvingEmergency} onOpenChange={(open) => !open && setResolvingEmergency(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve emergency</DialogTitle>
            <DialogDescription>Who helped resolve this request?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!resolveExternal ? "default" : "outline"}
                className="flex-1 gap-1 rounded-full"
                onClick={() => setResolveExternal(false)}
              >
                <UserCheck className="h-3.5 w-3.5" />
                App user
              </Button>
              <Button
                size="sm"
                variant={resolveExternal ? "default" : "outline"}
                className="flex-1 gap-1 rounded-full"
                onClick={() => setResolveExternal(true)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Outside
              </Button>
            </div>

            {resolveExternal ? (
              <Textarea
                rows={2}
                placeholder="Optional note about the helper…"
                value={resolveNote}
                onChange={(ev) => setResolveNote(ev.target.value)}
              />
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">Helper User ID</Label>
                <Input
                  className="font-mono text-xs"
                  placeholder="Paste helper user ID"
                  value={resolveHelperUserId}
                  onChange={(ev) => setResolveHelperUserId(ev.target.value)}
                />
                <Input
                  placeholder="Optional note"
                  value={resolveNote}
                  onChange={(ev) => setResolveNote(ev.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolvingEmergency(null)}>
                Cancel
              </Button>
              <Button
                className="gap-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => void handleResolve()}
                disabled={resolveSaving}
              >
                <CheckCircle2 className="h-4 w-4" />
                {resolveSaving ? "Saving…" : "Mark resolved"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Helpers */}
      <Dialog open={!!helpersFor} onOpenChange={(open) => !open && setHelpersFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmed helpers</DialogTitle>
            <DialogDescription>{helpersFor?.title}</DialogDescription>
          </DialogHeader>
          {helpersLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : helpers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No helpers yet.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {helpers.map((h) => (
                <li key={`${h.emergencyId}-${h.helperUserId}-${h.helpedAt}`} className="rounded-xl border px-3 py-2">
                  <div className="break-all font-mono text-xs">{h.helperUserId}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.helpedAt).toLocaleString()}</div>
                  {h.note && <div className="mt-1 text-xs">Note: {h.note}</div>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
