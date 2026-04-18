import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Phone,
  MessageCircle,
  Mail,
  Link as LinkIcon,
  LayoutGrid,
  List,
  Settings,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyDirectory } from "@/components/ui/empty-state";
import { directoryApi, type DirectoryProfileSummary, type DirectoryActionDto } from "@/lib/api";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getActionIcon(type: string) {
  switch (type.toUpperCase()) {
    case "CALL": return <Phone className="h-3.5 w-3.5" />;
    case "WHATSAPP": return <MessageCircle className="h-3.5 w-3.5" />;
    case "EMAIL": return <Mail className="h-3.5 w-3.5" />;
    default: return <LinkIcon className="h-3.5 w-3.5" />;
  }
}

function getActionHref(action: DirectoryActionDto): string {
  const t = action.type.toUpperCase();
  if (t === "CALL") return `tel:${action.value.replace(/\s/g, "")}`;
  if (t === "EMAIL") return `mailto:${action.value}`;
  if (t === "WHATSAPP") {
    const d = action.value.replace(/\D/g, "");
    const num = d.startsWith("91") && d.length >= 12 ? d : d.length === 10 ? "91" + d : d;
    return `https://wa.me/${num}`;
  }
  return action.value.startsWith("http") ? action.value : `https://${action.value}`;
}

type ViewMode = "grid" | "list";

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ["directory", "members"],
    queryFn: () => directoryApi.list(),
  });

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return (members as DirectoryProfileSummary[]).filter(
      (m) => (m.fullName ?? "").toLowerCase().includes(q) || (m.city ?? "").toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  return (
    <AppLayout title="Directory">
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Member Directory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading…" : `${filteredMembers.length} members`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/directory/settings">
              <Settings className="h-4 w-4" />
              My Settings
            </Link>
          </Button>
        </div>

        {/* Search + View toggle */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              : "space-y-2"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn(
                "bg-muted/60 rounded-xl animate-pulse",
                viewMode === "grid" ? "h-44" : "h-16"
              )} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-destructive text-center py-12">Failed to load directory.</p>
        ) : filteredMembers.length === 0 ? (
          <EmptyDirectory onClear={() => setSearchQuery("")} />
        ) : viewMode === "grid" ? (
          <GridView members={filteredMembers} />
        ) : (
          <ListView members={filteredMembers} />
        )}
      </div>
    </AppLayout>
  );
}

function GridView({ members }: { members: DirectoryProfileSummary[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {members.map((m) => (
        <Link key={m.userId} to={`/directory/${m.userId}`} className="block">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow h-full">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarImage src={m.photoUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(m.fullName ?? "M")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 w-full">
                <p className="font-medium text-sm truncate">{m.fullName ?? "Member"}</p>
                {m.city && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.city}</span>
                  </p>
                )}
              </div>
              {m.actions.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {m.actions.slice(0, 3).map((a, i) => (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(getActionHref(a), a.type.toUpperCase() === "CALL" ? "_self" : "_blank");
                      }}
                      className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                    >
                      {getActionIcon(a.type)}
                    </span>
                  ))}
                  {m.actions.length > 3 && (
                    <span className="p-1.5 text-xs text-muted-foreground">+{m.actions.length - 3}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ListView({ members }: { members: DirectoryProfileSummary[] }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm divide-y">
      {members.map((m) => (
        <Link
          key={m.userId}
          to={`/directory/${m.userId}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors"
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={m.photoUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(m.fullName ?? "M")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{m.fullName ?? "Member"}</p>
            {m.city && (
              <p className="text-xs text-muted-foreground truncate">{m.city}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {m.actions.slice(0, 3).map((a, i) => (
              <span
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(getActionHref(a), a.type.toUpperCase() === "CALL" ? "_self" : "_blank");
                }}
                className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
              >
                {getActionIcon(a.type)}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
