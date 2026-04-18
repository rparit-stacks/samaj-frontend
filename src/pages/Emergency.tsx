import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Eye,
  Users,
  Pencil,
  Trash2,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  BarChart3,
  History,
  UserCheck,
  ExternalLink,
  Search,
  X,
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

/* ─────── Helpers ─────── */

const STATUS_CONFIG: Record<
  EmergencyStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  OPEN: {
    label: "Active",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-300 dark:border-yellow-800",
  },
  HELP_RECEIVED: {
    label: "Help Received",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
  },
  RESOLVED: {
    label: "Resolved",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-300 dark:border-green-800",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900/40",
    border: "border-gray-300 dark:border-gray-700",
  },
  CLOSED: {
    label: "Closed",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/40",
    border: "border-gray-300 dark:border-gray-700",
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─────── Main Component ─────── */

export default function Emergency() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const myUserId = user?.id ?? "";

  // Data
  const [allEmergencies, setAllEmergencies] = useState<EmergencyItem[]>([]);
  const [myEmergencies, setMyEmergencies] = useState<EmergencyItem[]>([]);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded card
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters & sort (View All tab)
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCity, setFilterCity] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "urgent">("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Edit dialog
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

  // Resolve dialog
  const [resolvingEmergency, setResolvingEmergency] = useState<EmergencyItem | null>(null);
  const [resolveExternal, setResolveExternal] = useState(false);
  const [resolveHelperSearch, setResolveHelperSearch] = useState("");
  const [resolveHelperUserId, setResolveHelperUserId] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [resolveSaving, setResolveSaving] = useState(false);

  // Helpers dialog
  const [helpersFor, setHelpersFor] = useState<EmergencyItem | null>(null);
  const [helpers, setHelpers] = useState<EmergencyHelpItem[]>([]);
  const [helpersLoading, setHelpersLoading] = useState(false);

  // Deleting
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Emergency detail (for global Search click)
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
      .catch((e: any) => {
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

  /* ─── Load data ─── */
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
    } catch (err: any) {
      toast({
        title: "Failed to load emergencies",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Filtered & sorted list (View All) ─── */
  const filteredAll = useMemo(() => {
    let list = allEmergencies.filter((e) => e.status !== "CANCELLED");
    if (filterType !== "ALL") {
      list = list.filter((e) => e.type === filterType);
    }
    if (filterCity.trim()) {
      const q = filterCity.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.city?.toLowerCase().includes(q) ||
          e.area?.toLowerCase().includes(q) ||
          e.state?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // "urgent" – active first, then by date
      const statusOrder: Record<string, number> = {
        OPEN: 0,
        IN_PROGRESS: 1,
        HELP_RECEIVED: 2,
        RESOLVED: 3,
        CLOSED: 4,
        CANCELLED: 5,
      };
      const diff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [allEmergencies, filterType, filterCity, sortBy]);

  /* ─── My emergencies split ─── */
  const myActive = myEmergencies.filter(
    (e) => e.status === "OPEN" || e.status === "IN_PROGRESS" || e.status === "HELP_RECEIVED"
  );
  const myResolved = myEmergencies.filter(
    (e) => e.status === "RESOLVED" || e.status === "CLOSED" || e.status === "CANCELLED"
  );

  /* ─── Actions ─── */

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
    if (!confirm("Are you sure you want to delete this emergency?")) return;
    try {
      setDeletingId(id);
      await emergencyApi.delete(id);
      toast({ title: "Emergency deleted" });
      await loadData();
    } catch (err: any) {
      toast({
        title: "Failed to delete",
        description: err?.message,
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
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const openResolve = (e: EmergencyItem) => {
    setResolvingEmergency(e);
    setResolveExternal(false);
    setResolveHelperSearch("");
    setResolveHelperUserId("");
    setResolveNote("");
  };

  const handleResolve = async () => {
    if (!resolvingEmergency) return;
    if (!resolveExternal && !resolveHelperUserId.trim()) {
      toast({
        title: "Select a helper",
        description: "Please enter a helper's User ID or mark as external helper.",
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
      toast({ title: "Emergency resolved!", description: "The emergency has been marked as resolved." });
      setResolvingEmergency(null);
      await loadData();
    } catch (err: any) {
      toast({
        title: "Failed to resolve",
        description: err?.message,
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
      const data = await emergencyApi.getHelpers(emergency.id);
      setHelpers(data);
    } catch (err: any) {
      toast({
        title: "Failed to load helpers",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setHelpersLoading(false);
    }
  };

  /* ─── Card renderer ─── */
  const renderCard = (
    e: EmergencyItem,
    options: { showActions?: boolean; isOwner?: boolean }
  ) => {
    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.OPEN;
    const isExpanded = expandedId === e.id;
    const isOwner = options.isOwner ?? e.creatorUserId === myUserId;
    const isActive = e.status === "OPEN" || e.status === "IN_PROGRESS";

    return (
      <div
        key={e.id}
        className={`rounded-2xl border-2 overflow-hidden transition-all ${cfg.border} ${cfg.bg}`}
      >
        {/* Header bar */}
        <div
          className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer select-none ${
            isActive
              ? "bg-red-600 dark:bg-red-700 text-white"
              : e.status === "RESOLVED"
              ? "bg-green-600 dark:bg-green-700 text-white"
              : e.status === "HELP_RECEIVED"
              ? "bg-blue-600 dark:bg-blue-700 text-white"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => {
            toggleExpand(e.id);
            handleTrackView(e.id);
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold truncate flex-1">{e.title}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-white/40 text-white/90 shrink-0"
          >
            {TYPE_LABELS[e.type] ?? e.type}
          </Badge>
          <span className="text-xs opacity-80 shrink-0 hidden sm:block">
            {timeAgo(e.createdAt)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </div>

        {/* Summary line (always visible) */}
        <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {e.city ?? "N/A"}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {e.viewCount} views
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {e.contactClickCount} contacts
          </span>
          <span className="flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            {e.helperCount} helped
          </span>
          <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current`}>
            {cfg.label}
          </Badge>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            <p className="text-sm whitespace-pre-line">{e.description}</p>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {locationString(e)}
              </div>
              {e.landmark && (
                <div className="ml-4 text-xs">Landmark: {e.landmark}</div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Emergency at: {new Date(e.emergencyAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Posted: {new Date(e.createdAt).toLocaleString()}
              </div>
              {(e.creatorDisplayName || e.creatorPhotoUrl) && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Posted by</span>
                  <Link
                    to={`/user/${e.creatorUserId}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    {e.creatorPhotoUrl && (
                      <img
                        src={e.creatorPhotoUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    )}
                    {e.creatorDisplayName ?? "Samaj Member"}
                  </Link>
                </div>
              )}
              {e.resolvedByExternal && (
                <div className="flex items-center gap-1 text-green-600">
                  <ExternalLink className="h-3 w-3" />
                  Resolved by external helper
                  {e.externalHelperNote && ` — ${e.externalHelperNote}`}
                </div>
              )}
            </div>

            {/* Contact buttons */}
            {isActive && (
              <div className="flex flex-wrap gap-2">
                {e.contactPreferences.phone && (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white gap-1"
                    asChild
                    onClick={() => handleContactClick(e.id)}
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
                    className="border-green-600 text-green-700 hover:bg-green-50 gap-1"
                    asChild
                    onClick={() => handleContactClick(e.id)}
                  >
                    <a
                      href={`https://wa.me/${e.contactPreferences.whatsapp.replace(
                        /[^\d]/g,
                        ""
                      )}?text=${encodeURIComponent(
                        `Hi, I saw your emergency on Samaj.\nI want to help you.\nEmergency ID: ${e.id}\nTitle: ${e.title}`
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
                    className="gap-1"
                    asChild
                    onClick={() => handleContactClick(e.id)}
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

            {/* Helper list shortcut */}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1"
              onClick={() => openHelpers(e)}
            >
              <Users className="h-3 w-3" />
              View confirmed helpers ({e.helperCount})
            </Button>

            {/* Owner actions */}
            {isOwner && options.showActions && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {(isActive || e.status === "HELP_RECEIVED") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      disabled={deletingId === e.id}
                      onClick={() => handleDelete(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === e.id ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => openResolve(e)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─────── RENDER ─────── */

  return (
    <AppLayout title="Emergency">
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-red-600" />
              Emergency Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and respond to community emergencies
            </p>
          </div>
          <Button
            className="gap-2 bg-red-600 hover:bg-red-700 text-white self-start"
            onClick={() => navigate("/emergency/create")}
          >
            <Plus className="h-4 w-4" />
            Report Emergency
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="h-3.5 w-3.5 hidden sm:block" />
              View All
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5 text-xs sm:text-sm">
              <AlertTriangle className="h-3.5 w-3.5 hidden sm:block" />
              My Emergencies
              {myActive.length > 0 && (
                <Badge className="bg-red-600 text-white text-[10px] ml-1 px-1.5 py-0">
                  {myActive.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
              My Dashboard
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: View All ── */}
          <TabsContent value="all" className="mt-5 space-y-4">
            {/* Filter & Sort bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowFilters((p) => !p)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {showFilters ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-auto gap-1 h-8 text-xs">
                  <ArrowUpDown className="h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="urgent">Most Urgent</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredAll.length} emergencies
              </span>
            </div>

            {showFilters && (
              <div className="bg-card rounded-xl p-3 border flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="MEDICAL">Medical</SelectItem>
                      <SelectItem value="ACCIDENT">Accident</SelectItem>
                      <SelectItem value="FINANCIAL">Financial</SelectItem>
                      <SelectItem value="BLOOD">Blood</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-[150px]">
                  <Label className="text-xs">Location</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-8 text-xs pl-7"
                      placeholder="Filter by city, area, state..."
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                    />
                    {filterCity && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setFilterCity("")}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <p className="text-muted-foreground">Loading emergencies...</p>
              </div>
            ) : filteredAll.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No emergencies found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAll.map((e) =>
                  renderCard(e, {
                    showActions: e.creatorUserId === myUserId,
                    isOwner: e.creatorUserId === myUserId,
                  })
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: My Emergencies ── */}
          <TabsContent value="mine" className="mt-5 space-y-6">
            {loading ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : myEmergencies.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl space-y-3">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  You haven't posted any emergencies yet.
                </p>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => navigate("/emergency/create")}
                >
                  <Plus className="h-4 w-4" />
                  Report Emergency
                </Button>
              </div>
            ) : (
              <>
                {/* Active */}
                {myActive.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                      Active Emergencies ({myActive.length})
                    </h2>
                    {myActive.map((e) =>
                      renderCard(e, { showActions: true, isOwner: true })
                    )}
                  </div>
                )}

                {/* Resolved / Past */}
                {myResolved.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Past Emergencies ({myResolved.length})
                    </h2>
                    {myResolved.map((e) =>
                      renderCard(e, { showActions: false, isOwner: true })
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── TAB 3: My Dashboard ── */}
          <TabsContent value="dashboard" className="mt-5 space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: "Total Created",
                  value: dashStats?.totalEmergenciesCreated ?? 0,
                  icon: AlertTriangle,
                  color: "text-red-600",
                },
                {
                  label: "Active",
                  value: dashStats?.activeEmergencies ?? 0,
                  icon: Clock,
                  color: "text-yellow-600",
                },
                {
                  label: "Resolved",
                  value: dashStats?.resolvedEmergencies ?? 0,
                  icon: CheckCircle2,
                  color: "text-green-600",
                },
                {
                  label: "Contact Clicks",
                  value: dashStats?.totalContactClicks ?? 0,
                  icon: Phone,
                  color: "text-blue-600",
                },
                {
                  label: "Total Views",
                  value: dashStats?.totalViews ?? 0,
                  icon: Eye,
                  color: "text-purple-600",
                },
                {
                  label: "People I Helped",
                  value: dashStats?.totalPeopleHelped ?? 0,
                  icon: UserCheck,
                  color: "text-emerald-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card rounded-xl border p-3 flex flex-col items-center text-center"
                >
                  <stat.icon className={`h-5 w-5 ${stat.color} mb-1`} />
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Resolved history */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Resolved History
              </h2>
              {myResolved.filter((e) => e.status === "RESOLVED").length === 0 ? (
                <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
                  No resolved emergencies yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {myResolved
                    .filter((e) => e.status === "RESOLVED")
                    .map((e) => (
                      <div
                        key={e.id}
                        className="bg-card rounded-xl border p-3 flex items-center gap-3"
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {locationString(e)} &middot;{" "}
                            {new Date(e.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              e.resolvedByExternal
                                ? "text-orange-600 border-orange-300"
                                : "text-green-600 border-green-300"
                            }`}
                          >
                            {e.resolvedByExternal ? "External" : "Platform"}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {e.helperCount} helper(s)
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* All past emergencies */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                All My Past Emergencies
              </h2>
              {myResolved.length === 0 ? (
                <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
                  No past emergencies.
                </div>
              ) : (
                <div className="space-y-2">
                  {myResolved.map((e) => {
                    const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.CLOSED;
                    return (
                      <div
                        key={e.id}
                        className="bg-card rounded-xl border p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          toggleExpand(e.id);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {locationString(e)} &middot;{" "}
                            {new Date(e.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${cfg.color} border-current shrink-0`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Guidelines */}
        <div className="bg-muted/50 rounded-2xl p-4 md:p-6">
          <h3 className="font-semibold mb-3">Emergency Posting Guidelines</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              &bull; Only post genuine emergencies that require immediate community help
            </li>
            <li>
              &bull; Provide accurate contact information and location details
            </li>
            <li>
              &bull; Update the status once the emergency is resolved
            </li>
            <li>
              &bull; For medical emergencies, always call 108 or local emergency
              services first
            </li>
            <li>
              &bull; False or misleading emergency posts may result in account
              suspension
            </li>
          </ul>
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={!!editingEmergency}
        onOpenChange={(open) => !open && setEditingEmergency(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Emergency</DialogTitle>
            <DialogDescription>
              Update the details of your emergency post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={editForm.title}
                onChange={(ev) =>
                  setEditForm((f) => ({ ...f, title: ev.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(ev) =>
                  setEditForm((f) => ({ ...f, description: ev.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Area</Label>
                <Input
                  value={editForm.area}
                  onChange={(ev) =>
                    setEditForm((f) => ({ ...f, area: ev.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  value={editForm.city}
                  onChange={(ev) =>
                    setEditForm((f) => ({ ...f, city: ev.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input
                  value={editForm.state}
                  onChange={(ev) =>
                    setEditForm((f) => ({ ...f, state: ev.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Input
                  value={editForm.country}
                  onChange={(ev) =>
                    setEditForm((f) => ({ ...f, country: ev.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Landmark</Label>
              <Input
                value={editForm.landmark}
                onChange={(ev) =>
                  setEditForm((f) => ({ ...f, landmark: ev.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(ev) =>
                    setEditForm((f) => ({
                      ...f,
                      contactPhone: ev.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={editForm.contactWhatsapp}
                  onChange={(ev) =>
                    setEditForm((f) => ({
                      ...f,
                      contactWhatsapp: ev.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  value={editForm.contactEmail}
                  onChange={(ev) =>
                    setEditForm((f) => ({
                      ...f,
                      contactEmail: ev.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingEmergency(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Emergency Detail Dialog (from global Search) ── */}
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
            <DialogTitle>Emergency Details</DialogTitle>
            <DialogDescription>
              {emergencyDetail ? emergencyDetail.title : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {emergencyDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">
                  {TYPE_LABELS[emergencyDetail.type] ?? emergencyDetail.type}
                </Badge>
                <Badge className={STATUS_CONFIG[emergencyDetail.status]?.color ?? ""}>
                  {STATUS_CONFIG[emergencyDetail.status]?.label ?? emergencyDetail.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{emergencyDetail.description}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location</p>
                <p>{locationString(emergencyDetail)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Helpers</p>
                  <p className="font-medium">{emergencyDetail.helperCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="font-medium">{emergencyDetail.viewCount}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {new Date(emergencyDetail.createdAt).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">Loading...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Resolve Dialog ── */}
      <Dialog
        open={!!resolvingEmergency}
        onOpenChange={(open) => !open && setResolvingEmergency(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Emergency</DialogTitle>
            <DialogDescription>
              Select who helped you resolve this emergency. Only you can mark it
              as resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Toggle: platform vs external */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!resolveExternal ? "default" : "outline"}
                className="flex-1 gap-1"
                onClick={() => setResolveExternal(false)}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Platform User
              </Button>
              <Button
                size="sm"
                variant={resolveExternal ? "default" : "outline"}
                className="flex-1 gap-1"
                onClick={() => setResolveExternal(true)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Outside Person
              </Button>
            </div>

            {resolveExternal ? (
              <div className="space-y-2">
                <Label className="text-xs">
                  Note about external helper (optional)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="E.g. Neighbor from next street, ambulance driver..."
                  value={resolveNote}
                  onChange={(ev) => setResolveNote(ev.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">Helper User ID</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-7 text-xs font-mono"
                    placeholder="Enter or paste user ID of the helper..."
                    value={resolveHelperUserId}
                    onChange={(ev) =>
                      setResolveHelperUserId(ev.target.value)
                    }
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ask the helper for their User ID from their profile page, or
                  check the helpers list.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Note (optional)</Label>
                  <Input
                    placeholder="How did they help?"
                    value={resolveNote}
                    onChange={(ev) => setResolveNote(ev.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setResolvingEmergency(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={handleResolve}
                disabled={resolveSaving}
              >
                <CheckCircle2 className="h-4 w-4" />
                {resolveSaving ? "Resolving..." : "Mark Resolved"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Helpers Dialog ── */}
      <Dialog
        open={!!helpersFor}
        onOpenChange={(open) => !open && setHelpersFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmed Helpers</DialogTitle>
            <DialogDescription>
              Users who helped with: {helpersFor?.title}
            </DialogDescription>
          </DialogHeader>
          {helpersLoading ? (
            <p className="text-sm text-muted-foreground">Loading helpers...</p>
          ) : helpers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No helpers recorded yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {helpers.map((h) => (
                <li
                  key={`${h.emergencyId}-${h.helperUserId}-${h.helpedAt}`}
                  className="rounded-lg border bg-card px-3 py-2"
                >
                  <div className="font-mono text-xs break-all">
                    {h.helperUserId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.helpedAt).toLocaleString()}
                  </div>
                  {h.note && (
                    <div className="mt-1 text-xs">Note: {h.note}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
