import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  MapPin,
  GraduationCap,
  Briefcase,
  Heart,
  MessageCircle,
  Users,
  Star,
  Loader2,
} from "lucide-react";
import { matrimonyApi, type MatrimonyProfileDetail } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MatrimonyInterestDialog } from "@/components/dialogs/MatrimonyInterestDialog";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatHeightCm(cm: number | null): string {
  if (cm == null || cm <= 0) return "—";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${ft}'${inch}" (${cm} cm)`;
}

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr ago`;
  return d.toLocaleDateString();
}

function partnerAgeLine(p: MatrimonyProfileDetail["partnerPreferences"]): string {
  const { ageMin, ageMax } = p;
  if (ageMin != null && ageMax != null) return `${ageMin} – ${ageMax} years`;
  if (ageMin != null) return `${ageMin}+ years`;
  if (ageMax != null) return `Up to ${ageMax} years`;
  return "—";
}

function partnerHeightLine(p: MatrimonyProfileDetail["partnerPreferences"]): string {
  const { heightMinCm, heightMaxCm } = p;
  if (heightMinCm != null && heightMaxCm != null)
    return `${formatHeightCm(heightMinCm)} – ${formatHeightCm(heightMaxCm)}`;
  return "—";
}

function initialsFromName(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "—"
  );
}

export default function MatrimonyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [interestOpen, setInterestOpen] = useState(false);
  const viewRecorded = useRef(false);

  const { data: summary } = useQuery({
    queryKey: ["matrimony-me"],
    queryFn: () => matrimonyApi.meSummary(),
  });

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["matrimony-profile", id],
    queryFn: () => matrimonyApi.getProfile(id!),
    enabled: !!id,
  });

  const isOwner =
    !!profile?.ownerUserId && !!user?.id && profile.ownerUserId === user.id;

  const { data: favorites } = useQuery({
    queryKey: ["matrimony-favorites"],
    queryFn: () => matrimonyApi.listFavorites(),
    enabled: !!id && summary?.canBrowse === true && !isOwner,
  });

  const { data: moreProfilesPage, isLoading: moreProfilesLoading } = useQuery({
    queryKey: ["matrimony-more-profiles", id],
    queryFn: () =>
      matrimonyApi.searchProfiles({
        page: 0,
        size: 8,
        minAge: 21,
        maxAge: 40,
      }),
    enabled: !!id && summary?.canBrowse === true,
  });

  const moreProfiles = (moreProfilesPage?.content ?? []).filter(
    (p) => p.id !== id && p.status === "ACTIVE",
  );

  const activeFromId = summary?.profiles.find((p) => p.status === "ACTIVE")?.id ?? "";
  const onShortlist = !!(id && favorites?.some((f) => f.id === id));

  useEffect(() => {
    viewRecorded.current = false;
  }, [id]);

  useEffect(() => {
    if (!id || !profile || viewRecorded.current || isOwner || !summary?.canBrowse) return;
    viewRecorded.current = true;
    void matrimonyApi.recordProfileView(id).catch(() => {});
  }, [id, profile, isOwner, summary?.canBrowse]);

  const favMutation = useMutation({
    mutationFn: () => matrimonyApi.toggleFavorite(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matrimony-profile", id] });
      void queryClient.invalidateQueries({ queryKey: ["matrimony-search"] });
      void queryClient.invalidateQueries({ queryKey: ["matrimony-favorites"] });
    },
    onError: (err: Error) => toast({ title: "Could not update shortlist", description: err.message, variant: "destructive" }),
  });

  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!id || !activeFromId) throw new Error("No active profile");
      return matrimonyApi.openConversation({ myProfileId: activeFromId, otherProfileId: id });
    },
    onSuccess: (conv) => {
      void queryClient.invalidateQueries({ queryKey: ["matrimony-conversations"] });
      navigate(`/matrimony/chats/${conv.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Could not open chat", description: err.message, variant: "destructive" });
    },
  });

  if (!id) return null;

  return (
    <MatrimonyLayout title="Matrimony">
      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <aside className="hidden md:block md:col-span-1 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold">More profiles</h3>
                <p className="text-xs text-muted-foreground">Tap to view details</p>
              </div>

              {moreProfilesLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                </div>
              )}

              {!moreProfilesLoading && moreProfiles.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No more matches found.</p>
              )}

              {!moreProfilesLoading && moreProfiles.length > 0 && (
                <ul className="space-y-2">
                  {moreProfiles.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/matrimony/${p.id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          p.id === id ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"
                        }`}
                      >
                        {p.primaryPhotoUrl ? (
                          <img src={p.primaryPhotoUrl} alt="" className="h-12 w-12 rounded-lg object-cover bg-muted" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">
                            {initialsFromName(p.displayName)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.age} yrs · {p.city || "—"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="space-y-6 md:col-span-2">
              <div className="md:hidden">
                <Link to="/matrimony">
                  <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back to profiles
                  </Button>
                </Link>
              </div>

          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
            </div>
          )}

          {error && (
            <p className="text-center text-destructive py-12">
              {(error as Error).message || "Profile not found"}
            </p>
          )}

          {profile && (
            <>
              {profile.photosLimited && (
                <Alert>
                  <AlertDescription>
                    Some photos are visible only after your interest is accepted.
                  </AlertDescription>
                </Alert>
              )}

              {isOwner && profile.completionPercent != null && (
                <div className="rounded-xl border bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                  <p className="text-sm">
                    Profile completion: <strong>{profile.completionPercent}%</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/matrimony/profile/${profile.id}/edit`}>Edit wizard</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/matrimony/profile/${profile.id}/settings`}>Settings</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
                {(profile.photoUrls?.length ? profile.photoUrls : [null]).map((photo, index) => (
                  <div key={photo ?? `empty-${index}`} className={index === 0 ? "col-span-2 row-span-2" : ""}>
                    {photo ? (
                      <img src={photo} alt="" className="w-full h-full object-cover aspect-square bg-muted" />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">
                        No photo
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                  {profile.verified && <Badge className="bg-green-100 text-green-700">Verified</Badge>}
                </div>
                <p className="text-muted-foreground">
                  {profile.age} years • {formatHeightCm(profile.heightCm)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last active: {profile.lastActiveAt ? formatLastActive(profile.lastActiveAt) : "Hidden"}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {!isOwner && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    type="button"
                    disabled={!summary?.canBrowse || favMutation.isPending}
                    onClick={() => favMutation.mutate()}
                  >
                    <Star
                      className={`h-4 w-4 ${onShortlist ? "fill-amber-400 text-amber-500" : ""}`}
                    />
                    {onShortlist ? "Shortlisted" : "Shortlist"}
                  </Button>
                )}
                <Button
                  className="flex-1 min-w-[140px] gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                  disabled={!summary?.canBrowse || !activeFromId || isOwner}
                  onClick={() => setInterestOpen(true)}
                >
                  <Heart className="h-4 w-4" />
                  Send Interest
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px] gap-2"
                  disabled={!summary?.canBrowse || !activeFromId || chatMutation.isPending || isOwner}
                  onClick={() => chatMutation.mutate()}
                >
                  {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Start Chat
                </Button>
              </div>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Profession</p>
                      <p className="font-medium">{profile.profession || "—"}</p>
                      <p className="text-xs text-muted-foreground">{profile.company || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Education</p>
                      <p className="font-medium">{profile.education || "—"}</p>
                      <p className="text-xs text-muted-foreground">{profile.college || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {[profile.city, profile.state].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Native Place</p>
                      <p className="font-medium">{profile.nativePlace || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{profile.weightKg != null ? `${profile.weightKg} kg` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Income</p>
                      <p className="font-medium">{profile.incomeBracket || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Religion / Caste</p>
                      <p className="font-medium">
                        {[profile.religion, profile.caste].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Smoking</p>
                      <p className="font-medium">{profile.smoking?.replace(/_/g, " ") ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Drinking</p>
                      <p className="font-medium">{profile.drinking?.replace(/_/g, " ") ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio || "—"}</p>
                  {profile.hobbies?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Hobbies & Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.hobbies.map((hobby) => (
                          <Badge key={hobby} variant="secondary">
                            {hobby}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Family Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Father</p>
                      <p className="font-medium">{profile.family.father || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mother</p>
                      <p className="font-medium">{profile.family.mother || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Siblings</p>
                      <p className="font-medium">{profile.family.siblings || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Family Type</p>
                      <p className="font-medium">{profile.family.familyType || "—"}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-muted-foreground text-sm">Family Values</p>
                    <p className="font-medium text-sm">{profile.family.familyValues || "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Partner Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Age</p>
                    <p className="font-medium">{partnerAgeLine(profile.partnerPreferences)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Height</p>
                    <p className="font-medium">{partnerHeightLine(profile.partnerPreferences)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Education</p>
                    <p className="font-medium">{profile.partnerPreferences.educationNote || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profession</p>
                    <p className="font-medium">{profile.partnerPreferences.professionNote || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Location Preference</p>
                    <p className="font-medium">{profile.partnerPreferences.locationNote || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Other expectations</p>
                    <p className="font-medium whitespace-pre-wrap">{profile.partnerOtherExpectations || "—"}</p>
                  </div>
                </CardContent>
              </Card>

              <MatrimonyInterestDialog
                open={interestOpen}
                onOpenChange={setInterestOpen}
                fromProfileId={activeFromId}
                toProfileId={profile.id}
                profile={{
                  name: profile.displayName,
                  avatar: profile.photoUrls?.[0],
                  age: profile.age,
                  profession: profile.profession ?? "",
                  city: profile.city ?? "",
                }}
              />
            </>
          )}
            </div>
          </div>
        </div>
      </div>
    </MatrimonyLayout>
  );
}
