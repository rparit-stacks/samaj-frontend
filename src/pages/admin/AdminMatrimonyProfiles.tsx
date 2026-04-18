import { useState, useMemo } from "react";
import {
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  Users,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminMatrimonyApi,
  type AdminMatrimonyProfileDto,
  type AdminMatrimonyProfileDetailDto,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Radix Select forbids `value=""`; use this for "no filter" options. */
const FILTER_ALL = "__all__";

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function AdminMatrimonyProfiles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [genderFilter, setGenderFilter] = useState(FILTER_ALL);
  const [verifiedFilter, setVerifiedFilter] = useState(FILTER_ALL);
  const [visibleFilter, setVisibleFilter] = useState(FILTER_ALL);
  const [detailProfile, setDetailProfile] = useState<AdminMatrimonyProfileDetailDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: [
      "admin",
      "matrimony",
      "profiles",
      page,
      searchQuery,
      statusFilter,
      genderFilter,
      verifiedFilter,
      visibleFilter,
    ],
    queryFn: () =>
      adminMatrimonyApi.listProfiles({
        page,
        size: 20,
        q: searchQuery || undefined,
        status: statusFilter === FILTER_ALL ? undefined : statusFilter,
        gender: genderFilter === FILTER_ALL ? undefined : genderFilter,
        verified: verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined,
        visibleInSearch: visibleFilter === "visible" ? true : visibleFilter === "hidden" ? false : undefined,
      }),
  });

  const stats = useMemo(() => {
    return {
      total: profiles?.totalElements ?? 0,
      pages: profiles?.totalPages ?? 0,
      current: profiles?.number ?? 0,
    };
  }, [profiles]);

  const verifyMutation = useMutation({
    mutationFn: (profileId: string) => adminMatrimonyApi.verifyProfile(profileId),
    onMutate: (profileId) => setActingId(profileId),
    onSettled: () => setActingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrimony", "profiles"] });
      toast({ title: "Profile verification toggled" });
    },
    onError: (err) => {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (profileId: string) => adminMatrimonyApi.toggleVisibility(profileId),
    onMutate: (profileId) => setActingId(profileId),
    onSettled: () => setActingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrimony", "profiles"] });
      toast({ title: "Profile visibility toggled" });
    },
    onError: (err) => {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const detailMutation = useQuery({
    queryKey: ["admin", "matrimony", "profile", detailProfile?.id],
    queryFn: () => detailProfile?.id ? adminMatrimonyApi.getProfile(detailProfile.id) : null,
    enabled: !!detailProfile?.id && detailOpen,
  });

  const openDetail = async (profile: AdminMatrimonyProfileDto) => {
    setDetailProfile(profile as any);
    setDetailOpen(true);
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfileToDelete(profileId);
    setDeleteDialogOpen(true);
  };

  const statusBadgeColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "PAUSED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matrimony profiles</h1>
          <p className="text-slate-600 mt-1">
            Manage, verify, and moderate matrimony profiles. Monitor profile quality and ensure community safety.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500 font-medium">TOTAL PROFILES</p>
                <p className="text-lg font-bold text-slate-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-500 font-medium">VERIFIED</p>
                <p className="text-lg font-bold text-slate-900">
                  {profiles?.content.filter((p) => p.verified).length ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-slate-500 font-medium">ACTIVE</p>
                <p className="text-lg font-bold text-slate-900">
                  {profiles?.content.filter((p) => p.profileStatus === "ACTIVE").length ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Search name/email</Label>
                <Input
                  placeholder="Display name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  className="h-9"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Gender</Label>
                <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All genders</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Verification</Label>
                <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Visibility</Label>
                <Select value={visibleFilter} onValueChange={(v) => { setVisibleFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>All</SelectItem>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile List */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">
              Profiles {stats.total > 0 && <span className="text-slate-500 font-normal">({stats.total})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (profiles?.content ?? []).length === 0 ? (
              <p className="text-center text-slate-500 py-8">No profiles found</p>
            ) : (
              <div className="space-y-2">
                {profiles?.content.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">{profile.displayName}</h3>
                        {profile.verified && <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge className={statusBadgeColor(profile.profileStatus)}>
                          {profile.profileStatus}
                        </Badge>
                        <span className="text-slate-600">
                          {profile.age} • {profile.gender}
                        </span>
                        <span className="text-slate-600">{profile.city}</span>
                        <span className="text-slate-600">{profile.ownerEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={actingId === profile.id}>
                            {actingId === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(profile)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => verifyMutation.mutate(profile.id)}
                            disabled={actingId === profile.id}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {profile.verified ? "Unverify" : "Verify"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => visibilityMutation.mutate(profile.id)}
                            disabled={actingId === profile.id}
                          >
                            {profile.visibleInSearch ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide from search
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Show in search
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {(stats.pages ?? 0) > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-600">
                  Page {stats.current + 1} of {stats.pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage(Math.max(0, page - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= stats.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Profile Details</DialogTitle>
            </DialogHeader>
            {detailMutation.isLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : detailMutation.data ? (
              <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{detailMutation.data.displayName}</h3>
                    <p className="text-sm text-slate-600">{detailMutation.data.ownerEmail}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 font-medium">Gender</p>
                      <p className="text-slate-900">{detailMutation.data.gender}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Age</p>
                      <p className="text-slate-900">
                        {calculateAge(detailMutation.data.dateOfBirth)} years
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Height</p>
                      <p className="text-slate-900">{detailMutation.data.heightCm ?? "—"} cm</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Weight</p>
                      <p className="text-slate-900">{detailMutation.data.weightKg ?? "—"} kg</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Location</p>
                      <p className="text-slate-900">
                        {[detailMutation.data.city, detailMutation.data.state, detailMutation.data.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Status</p>
                      <Badge className={statusBadgeColor(detailMutation.data.profileStatus)}>
                        {detailMutation.data.profileStatus}
                      </Badge>
                    </div>
                  </div>
                  {detailMutation.data.bio && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-slate-500 font-medium text-sm mb-1">Bio</p>
                        <p className="text-slate-900 text-sm">{detailMutation.data.bio}</p>
                      </div>
                    </>
                  )}
                  {(detailMutation.data.hobbies?.length ?? 0) > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-slate-500 font-medium text-sm mb-2">Hobbies</p>
                        <div className="flex flex-wrap gap-2">
                          {detailMutation.data.hobbies?.map((h, i) => (
                            <Badge key={i} variant="secondary">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {(detailMutation.data.photoUrls?.length ?? 0) > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-slate-500 font-medium text-sm mb-2">Photos</p>
                        <div className="grid grid-cols-3 gap-2">
                          {detailMutation.data.photoUrls?.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Photo ${i + 1}`}
                              className="w-full h-24 object-cover rounded border border-slate-200"
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Created</p>
                      <p className="text-slate-900">{formatDate(detailMutation.data.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Last Active</p>
                      <p className="text-slate-900">{formatDate(detailMutation.data.lastActiveAt)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Completion</p>
                      <p className="text-slate-900">{detailMutation.data.completionPercent}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Verified</p>
                      <p className="text-slate-900">{detailMutation.data.verified ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
