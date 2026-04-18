import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Loader2 } from "lucide-react";
import { matrimonyApi, type MatrimonyMessagePolicy, type MatrimonyPhotoVisibility } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export default function MatrimonySettings() {
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [visibleInSearch, setVisibleInSearch] = useState(true);
  const [paused, setPaused] = useState(false);
  const [photoVis, setPhotoVis] = useState<MatrimonyPhotoVisibility>("ALL");
  const [showContact, setShowContact] = useState(true);
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [msgPolicy, setMsgPolicy] = useState<MatrimonyMessagePolicy>("ALL_ACTIVE");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["matrimony-profile", profileId],
    queryFn: () => matrimonyApi.getProfile(profileId!),
    enabled: !!profileId,
  });

  useEffect(() => {
    if (profile?.privacy) {
      setVisibleInSearch(profile.privacy.visibleInSearch);
      setPhotoVis(profile.privacy.photoVisibility);
      setShowContact(profile.privacy.showContactDetails);
      setHideLastSeen(profile.privacy.hideLastSeen);
      setMsgPolicy(profile.privacy.messagePolicy);
    }
    if (profile?.status === "PAUSED") setPaused(true);
    else setPaused(false);
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        visibleInSearch: !paused && visibleInSearch,
        photoVisibility: photoVis,
        showContactDetails: showContact,
        hideLastSeen,
        messagePolicy: msgPolicy,
      };
      if (paused) body.status = "PAUSED";
      else if (profile?.status === "PAUSED") body.status = "ACTIVE";
      return matrimonyApi.updateProfile(profileId!, body);
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      void qc.invalidateQueries({ queryKey: ["matrimony-profile", profileId] });
      void qc.invalidateQueries({ queryKey: ["matrimony-me"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!profileId) return null;

  return (
    <MatrimonyLayout title="Matrimony settings">
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <Link to={`/matrimony/my`}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            My profiles
          </Button>
        </Link>

        <h1 className="text-xl font-bold">Privacy & visibility</h1>
        <p className="text-sm text-muted-foreground">{profile?.displayName}</p>

        {isLoading && (
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        )}

        {profile && !profile.privacy && (
          <p className="text-sm text-muted-foreground">You can only edit settings for your own profile.</p>
        )}

        {profile?.privacy && (
          <div className="space-y-6 bg-card rounded-2xl p-6 border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Disable profile (paused)</Label>
                <p className="text-xs text-muted-foreground">Hide from search; keep data</p>
              </div>
              <Switch checked={paused} onCheckedChange={setPaused} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Show in search / browse</Label>
                <p className="text-xs text-muted-foreground">When active and not paused</p>
              </div>
              <Switch checked={visibleInSearch} onCheckedChange={setVisibleInSearch} disabled={paused} />
            </div>
            <div className="space-y-2">
              <Label>Photo visibility</Label>
              <Select value={photoVis} onValueChange={(v) => setPhotoVis(v as MatrimonyPhotoVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All photos to eligible members</SelectItem>
                  <SelectItem value="AFTER_ACCEPTANCE">Full album after accepted interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Show contact details</Label>
                <p className="text-xs text-muted-foreground">When you add phone/email later</p>
              </div>
              <Switch checked={showContact} onCheckedChange={setShowContact} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Hide last seen</Label>
              </div>
              <Switch checked={hideLastSeen} onCheckedChange={setHideLastSeen} />
            </div>
            <div className="space-y-2">
              <Label>Who can message you</Label>
              <Select value={msgPolicy} onValueChange={(v) => setMsgPolicy(v as MatrimonyMessagePolicy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_ACTIVE">Anyone with active matrimony profile</SelectItem>
                  <SelectItem value="ACCEPTED_ONLY">Only after accepted interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Block users from the block list (user IDs) via API <code>/api/v1/matrimony/blocks</code> — UI for blocking by profile coming next.
            </p>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full bg-pink-600">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
            </Button>
          </div>
        )}
      </div>
    </MatrimonyLayout>
  );
}
