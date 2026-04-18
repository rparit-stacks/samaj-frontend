import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicUserLookupApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MapPin, Phone, User } from "lucide-react";

function initialsOf(name?: string | null): string {
  const v = (name ?? "").trim();
  if (!v) return "U";
  return v
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]!)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserQuickProfileDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}) {
  const enabled = open && !!userId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin", "publicUser", "profile", userId],
    queryFn: () => publicUserLookupApi.profileByUserId(userId!),
    enabled,
  });

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ["admin", "publicUser", "contact", userId],
    queryFn: () => publicUserLookupApi.contactByUserId(userId!),
    enabled,
  });

  const name = useMemo(() => {
    const n = profile?.fullName?.trim();
    if (n) return n;
    return profile?.profileKey || "Member";
  }, [profile?.fullName, profile?.profileKey]);

  const cityLine = useMemo(() => {
    const parts = [profile?.city, profile?.profession].filter((x) => !!x && String(x).trim().length > 0);
    return parts.join(" • ");
  }, [profile?.city, profile?.profession]);

  const phone = contact?.phone ?? null;
  const email = contact?.email ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            User profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-slate-200 bg-slate-100">
            <AvatarImage src={profile?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-slate-200 text-slate-700">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900 truncate">
              {profileLoading ? "Loading…" : name}
            </p>
            <div className="flex items-center gap-2 mt-1 text-slate-600 text-sm">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span className="truncate">{cityLine || "—"}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="bg-slate-100 text-slate-800 border border-slate-200">
                userId: {profile?.userId ?? userId ?? "—"}
              </Badge>
              {profile?.bloodGroup ? (
                <Badge variant="secondary" className="bg-slate-100 text-slate-800 border border-slate-200">
                  Blood: {profile.bloodGroup}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Phone</p>
            <p className="text-sm text-slate-900 mt-1">
              {contactLoading ? "Loading…" : phone ?? "Not available"}
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-white"
                disabled={!phone}
                onClick={() => {
                  if (!phone) return;
                  window.open(`tel:${phone}`, "_self");
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Email</p>
            <p className="text-sm text-slate-900 mt-1 truncate">
              {contactLoading ? "Loading…" : email ?? "Not available"}
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-white"
                disabled={!email}
                onClick={() => {
                  if (!email) return;
                  window.open(`mailto:${email}`, "_self");
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

