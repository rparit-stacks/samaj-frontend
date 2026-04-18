import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  User,
  Eye,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminEmergencyApi, type EmergencyItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  MEDICAL: "Medical",
  ACCIDENT: "Accident",
  FINANCIAL: "Financial",
  BLOOD: "Blood",
  OTHER: "Other",
};

function locationLine(e: EmergencyItem): string {
  if (e.city) {
    return [e.area, e.city, e.state, e.country].filter(Boolean).join(", ");
  }
  return e.locationDescription ?? "—";
}

export default function AdminEmergency() {
  const queryClient = useQueryClient();
  const { data: emergencies, isLoading, isError } = useQuery({
    queryKey: ["admin", "emergencies", "all"],
    queryFn: adminEmergencyApi.listAll,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: EmergencyItem["status"] }) =>
      adminEmergencyApi.patchStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "emergencies"] });
      toast.success("Emergency updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeEmergencies = useMemo(() => {
    return (emergencies ?? []).filter(
      (e) =>
        e.status === "OPEN" || e.status === "IN_PROGRESS" || e.status === "HELP_RECEIVED"
    );
  }, [emergencies]);

  const resolvedEmergencies = useMemo(() => {
    return (emergencies ?? []).filter(
      (e) =>
        e.status === "RESOLVED" || e.status === "CLOSED" || e.status === "CANCELLED"
    );
  }, [emergencies]);

  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminEmergencyApi.delete(id),
    onSuccess: () => {
      toast.success("Emergency deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "emergencies"] });
      setViewDialogOpen(false);
      setSelectedEmergency(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const phone = useMemo(() => {
    const cp = selectedEmergency?.contactPreferences;
    if (!cp)
      return null;
    if (cp.allowPhone && cp.phone) return cp.phone;
    return cp.phone ?? null;
  }, [selectedEmergency]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Emergency Management</h1>
            <p className="text-slate-600">All community emergencies (admin only)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-400">{activeEmergencies.length}</p>
              <p className="text-sm text-red-300">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-400">
                {activeEmergencies.filter((e) => e.status === "OPEN").length}
              </p>
              <p className="text-sm text-amber-300">OPEN</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-400">{resolvedEmergencies.length}</p>
              <p className="text-sm text-green-300">Resolved / closed</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Phone className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-400">—</p>
              <p className="text-sm text-blue-300">Avg response (later)</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-slate-100 border border-slate-200">
            <TabsTrigger value="active" className="data-[state=active]:bg-red-500">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Active ({activeEmergencies.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-primary">
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolved ({resolvedEmergencies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : isError ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-6 text-slate-600">
                    Failed to load emergencies. Use admin login and ensure backend is running.
                  </CardContent>
                </Card>
              ) : activeEmergencies.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-6 text-slate-600">No active emergencies.</CardContent>
                </Card>
              ) : (
                activeEmergencies.map((emergency) => {
                  const typeLabel = TYPE_LABELS[emergency.type] ?? emergency.type;
                  const isUrgent =
                    emergency.type === "MEDICAL" ||
                    emergency.type === "ACCIDENT" ||
                    emergency.type === "BLOOD";
                  const callNumber =
                    emergency.contactPreferences?.allowPhone && emergency.contactPreferences.phone
                      ? emergency.contactPreferences.phone
                      : emergency.contactPreferences?.phone || null;
                  return (
                    <Card
                      key={emergency.id}
                      className={`border-l-4 ${
                        isUrgent ? "border-l-red-500 bg-red-500/5" : "border-l-amber-500 bg-amber-500/5"
                      } bg-white border-slate-200 shadow-sm`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={isUrgent ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>
                                {typeLabel}
                              </Badge>
                              <span className="text-slate-500 text-sm">{emergency.status}</span>
                            </div>
                            <h3 className="text-slate-900 font-semibold text-lg">{emergency.title}</h3>
                            <p className="text-slate-600 mt-2 line-clamp-4">{emergency.description}</p>

                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1 min-w-0">
                                <User className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                  {emergency.creatorDisplayName ?? emergency.creatorUserId}
                                </span>
                              </span>
                              {callNumber ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {callNumber}
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span className="truncate">{locationLine(emergency)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedEmergency(emergency);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {callNumber ? (
                              <Button size="sm" variant="outline" className="border-slate-300" asChild>
                                <a href={`tel:${callNumber.replace(/\s/g, "")}`}>
                                  <Phone className="h-4 w-4 mr-1" />
                                  Call
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="border-slate-300" disabled>
                                <Phone className="h-4 w-4 mr-1" />
                                Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="resolved">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : resolvedEmergencies.length === 0 ? (
                  <div className="p-6 text-slate-600">No resolved emergencies.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left p-4 text-slate-600 font-medium">Emergency</th>
                        <th className="text-left p-4 text-slate-600 font-medium">Reported by</th>
                        <th className="text-left p-4 text-slate-600 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedEmergencies.map((emergency) => (
                        <tr key={emergency.id} className="border-b border-slate-100">
                          <td className="p-4 text-slate-900 font-medium">{emergency.title}</td>
                          <td className="p-4 text-slate-600">
                            {emergency.creatorDisplayName ?? emergency.creatorUserId}
                          </td>
                          <td className="p-4 text-slate-600">{emergency.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-white border-slate-200 max-w-lg text-slate-900">
            <DialogHeader>
              <DialogTitle>Emergency details</DialogTitle>
            </DialogHeader>
            {selectedEmergency && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-slate-800 border-slate-300 bg-white">
                      {TYPE_LABELS[selectedEmergency.type] ?? selectedEmergency.type}
                    </Badge>
                    <Badge variant="outline" className="text-slate-800 border-slate-300 bg-white">
                      {selectedEmergency.status}
                    </Badge>
                  </div>
                  <h4 className="text-slate-900 font-medium">{selectedEmergency.title}</h4>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{selectedEmergency.description}</p>
                  <p className="text-slate-500 text-xs">
                    {locationLine(selectedEmergency)} · Views {selectedEmergency.viewCount} · Contacts{" "}
                    {selectedEmergency.contactClickCount}
                  </p>
                </div>

                <div>
                  <label className="text-slate-700 text-sm">Internal notes (local only)</label>
                  <Textarea
                    placeholder="Optional notes for your team…"
                    className="mt-2 bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={patchMutation.isPending || selectedEmergency.status === "RESOLVED"}
                    onClick={() =>
                      selectedEmergency &&
                      patchMutation.mutate(
                        { id: selectedEmergency.id, status: "RESOLVED" },
                        { onSuccess: () => setViewDialogOpen(false) }
                      )
                    }
                  >
                    {patchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark resolved
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700"
                    disabled={patchMutation.isPending}
                    onClick={() =>
                      selectedEmergency &&
                      patchMutation.mutate(
                        { id: selectedEmergency.id, status: "CLOSED" },
                        { onSuccess: () => setViewDialogOpen(false) }
                      )
                    }
                  >
                    Close
                  </Button>
                </div>
                {phone ? (
                  <Button variant="outline" className="w-full border-slate-300 text-slate-700" asChild>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call reporter
                    </a>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-700 mt-2 hover:bg-red-50"
                  disabled={deleteMutation.isPending}
                  onClick={() => selectedEmergency && deleteMutation.mutate(selectedEmergency.id)}
                >
                  Delete emergency
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
