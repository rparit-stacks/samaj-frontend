import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

interface UserInfo {
  email?: string | null;
  phone?: string | null;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: UserProfile | null;
  user?: UserInfo | null;
  onProfileUpdated?: () => void;
}

const professions = ["Business", "Doctor", "Engineer", "Teacher", "Government", "Lawyer", "CA/CS", "Other"];
const bloodGroups = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function EditProfileDialog({ open, onOpenChange, profile, user, onProfileUpdated }: EditProfileDialogProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("business");
  const [bio, setBio] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (profile || user) {
      setName(profile?.fullName || user?.email?.split("@")[0] || "");
      setCity(profile?.city || "");
      setProfession((profile?.profession || "business").toLowerCase());
      setBio(profile?.bio || "");
      setBloodGroup(profile?.bloodGroup ?? "");
      setAvatarUrl(profile?.avatarUrl ?? null);
    }
  }, [profile, user, open]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({
        fullName: name.trim() || "",
        city: city || null,
        profession: profession || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        email: (profile?.email ?? user?.email) || null,
        phone: (profile?.phone ?? user?.phone) || null,
        bloodGroup: bloodGroup.trim() || null,
      });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      onProfileUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar preview + URL / upload */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="w-full max-w-md">
              <ImageUrlWithUpload
                id="edit-profile-avatar"
                label="Profile photo"
                optional
                value={avatarUrl ?? ""}
                onChange={(v) => setAvatarUrl(v.trim() || null)}
                folder="profile"
                auth="user"
                helperText="Upload a new picture or paste a direct image URL."
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input 
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Phone & Email (from account, synced to profile on save) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={user?.phone ?? profile?.phone ?? ""}
                disabled
                placeholder="Not set"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">From account; saved to profile on Save</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email"
                type="email"
                value={user?.email ?? profile?.email ?? ""}
                disabled
                placeholder="Not set"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">From account; saved to profile on Save</p>
            </div>
          </div>

          {/* Blood group */}
          <div className="space-y-2">
            <Label>Blood group (optional)</Label>
            <Select value={bloodGroup || "none"} onValueChange={(v) => setBloodGroup(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((bg) => (
                  <SelectItem key={bg || "none"} value={bg || "none"}>
                    {bg || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="edit-city">City</Label>
            <Input 
              id="edit-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Profession */}
          <div className="space-y-2">
            <Label>Profession</Label>
            <Select value={profession} onValueChange={setProfession}>
              <SelectTrigger>
                <SelectValue placeholder="Select profession" />
              </SelectTrigger>
              <SelectContent>
                {professions.map((prof) => (
                  <SelectItem key={prof} value={prof.toLowerCase()}>{prof}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio (optional)</Label>
            <Textarea 
              id="edit-bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
