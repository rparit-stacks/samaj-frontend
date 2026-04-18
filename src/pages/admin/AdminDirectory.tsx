import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminDirectoryApi, type AdminDirectoryEntrySummary, type AdminDirectoryEntryDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Users } from "lucide-react";
import { toast } from "sonner";

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

export default function AdminDirectory() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminDirectoryEntrySummary | null>(null);
  const [detail, setDetail] = useState<AdminDirectoryEntryDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin", "directory", { q }],
    queryFn: () => adminDirectoryApi.list(q),
  });

  const detailMutation = useMutation({
    mutationFn: (userId: string) => adminDirectoryApi.get(userId),
    onSuccess: (d) => {
      setDetail(d);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (p: { userId: string; visible: boolean; showInDirectory?: boolean }) =>
      adminDirectoryApi.update(p.userId, { visible: p.visible, showInDirectory: p.showInDirectory }),
    onSuccess: async (d) => {
      toast.success("Directory entry updated");
      setDetail(d);
      await qc.invalidateQueries({ queryKey: ["admin", "directory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminDirectoryApi.delete(userId),
    onSuccess: async () => {
      toast.success("Removed from directory");
      setDialogOpen(false);
      setSelected(null);
      setDetail(null);
      await qc.invalidateQueries({ queryKey: ["admin", "directory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = (row: AdminDirectoryEntrySummary) => {
    setSelected(row);
    setDialogOpen(true);
    setDetail(null);
    detailMutation.mutate(row.userId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Directory</h1>
            <p className="text-slate-600">
              Manage which members appear in the directory and what details are visible.
            </p>
          </div>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Search</Label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter by name, city or email..."
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            {isLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : !entries || entries.length === 0 ? (
              <p className="text-slate-500 text-sm">No members in directory.</p>
            ) : (
              <div className="space-y-2">
                {entries.map((row) => (
                  <button
                    key={row.userId}
                    type="button"
                    onClick={() => openDetail(row)}
                    className="w-full text-left rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-slate-200 bg-slate-100">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-slate-200 text-slate-700">
                          {initialsOf(row.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {row.fullName || "Member"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {row.city || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {row.visible ? "Visible" : "Hidden"} •{" "}
                        {row.showInDirectory ? "Listed" : "Not listed"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelected(null);
              setDetail(null);
            }
          }}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xl">
            <DialogHeader>
              <DialogTitle>Directory entry</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-slate-200 bg-slate-100">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-slate-200 text-slate-700">
                      {initialsOf(detail?.fullName ?? selected.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold truncate">
                      {detail?.fullName ?? selected.fullName ?? "Member"}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {detail?.profession || detail?.city || selected.city || "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      userId: {selected.userId}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-slate-700 flex items-center gap-1 text-xs uppercase tracking-wide">
                      <MapPin className="h-3 w-3" />
                      City
                    </Label>
                    <p className="text-sm text-slate-900">
                      {detail?.city ?? selected.city ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 flex items-center gap-1 text-xs uppercase tracking-wide">
                      <Phone className="h-3 w-3" />
                      Phone
                    </Label>
                    <p className="text-sm text-slate-900">
                      {detail?.phone ?? "Hidden / not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 flex items-center gap-1 text-xs uppercase tracking-wide">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <p className="text-sm text-slate-900">
                      {detail?.email ?? "Hidden / not set"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Show in directory</p>
                      <p className="text-xs text-slate-500">
                        When off, this member is removed from the directory for everyone.
                      </p>
                    </div>
                    <Switch
                      checked={detail?.showInDirectory ?? selected.showInDirectory}
                      onCheckedChange={(checked) => {
                        if (!detail) return;
                        updateMutation.mutate({
                          userId: detail.userId,
                          visible: detail.visible,
                          showInDirectory: checked,
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Visible details</p>
                      <p className="text-xs text-slate-500">
                        Controls whether directory card is visible; profile privacy still applies.
                      </p>
                    </div>
                    <Switch
                      checked={detail?.visible ?? selected.visible}
                      onCheckedChange={(checked) => {
                        if (!detail) return;
                        updateMutation.mutate({
                          userId: detail.userId,
                          visible: checked,
                          showInDirectory: detail.showInDirectory,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!selected) return;
                      deleteMutation.mutate(selected.userId);
                    }}
                  >
                    Remove from directory
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

