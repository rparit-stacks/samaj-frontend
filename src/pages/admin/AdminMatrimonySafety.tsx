import { useState } from "react";
import {
  Search,
  Loader2,
  Heart,
  Shield,
  Trash2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminMatrimonySafetyApi,
  type AdminMatrimonyInterestDto,
  type AdminMatrimonyBlockDto,
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

/** Radix Select forbids `value=""` on items. */
const FILTER_ALL = "__all__";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminMatrimonySafety() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("interests");
  const [interestPage, setInterestPage] = useState(0);
  const [interestSearch, setInterestSearch] = useState("");
  const [interestStatus, setInterestStatus] = useState(FILTER_ALL);
  const [blockPage, setBlockPage] = useState(0);
  const [blockSearch, setBlockSearch] = useState("");
  const [unblockDialog, setUnblockDialog] = useState(false);
  const [blockToUnblock, setBlockToUnblock] = useState<AdminMatrimonyBlockDto | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: interests, isLoading: interestsLoading } = useQuery({
    queryKey: ["admin", "matrimony", "safety", "interests", interestPage, interestSearch, interestStatus],
    queryFn: () =>
      adminMatrimonySafetyApi.listInterests({
        page: interestPage,
        size: 20,
        q: interestSearch || undefined,
        status: interestStatus === FILTER_ALL ? undefined : interestStatus,
      }),
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["admin", "matrimony", "safety", "blocks", blockPage, blockSearch],
    queryFn: () =>
      adminMatrimonySafetyApi.listBlocks({
        page: blockPage,
        size: 20,
        q: blockSearch || undefined,
      }),
  });

  const unblockMutation = useMutation({
    mutationFn: (block: AdminMatrimonyBlockDto) =>
      adminMatrimonySafetyApi.unblockUser(block.ownerUserId, block.blockedUserId),
    onMutate: (block) => setActingId(block.id),
    onSettled: () => setActingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "matrimony", "safety", "blocks"] });
      toast({ title: "Block removed" });
      setUnblockDialog(false);
      setBlockToUnblock(null);
    },
    onError: (err) => {
      toast({
        title: "Failed to remove block",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const statusBadgeColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Safety & Blocking</h1>
          <p className="text-slate-600 mt-1">
            Monitor interests and manage user blocks to ensure community safety.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interests" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Interests
            </TabsTrigger>
            <TabsTrigger value="blocks" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Blocks
            </TabsTrigger>
          </TabsList>

          {/* Interests Tab */}
          <TabsContent value="interests" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interest Flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Search profile names
                    </Label>
                    <Input
                      placeholder="Search by profile name..."
                      value={interestSearch}
                      onChange={(e) => {
                        setInterestSearch(e.target.value);
                        setInterestPage(0);
                      }}
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Status</Label>
                    <Select
                      value={interestStatus}
                      onValueChange={(v) => {
                        setInterestStatus(v);
                        setInterestPage(0);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">
                  All Interests{" "}
                  {interests && <span className="text-slate-500 font-normal">({interests.totalElements})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interestsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (interests?.content ?? []).length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No interests found</p>
                ) : (
                  <div className="space-y-2">
                    {interests?.content.map((interest) => (
                      <div
                        key={interest.id}
                        className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="font-semibold text-slate-900">
                              {interest.fromProfileName}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-900">
                              {interest.toProfileName}
                            </span>
                          </div>
                          <Badge className={statusBadgeColor(interest.status)}>
                            {interest.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-2">
                          <span>{interest.fromUserEmail}</span>
                          <span>→</span>
                          <span>{interest.toUserEmail}</span>
                        </div>
                        {interest.message && (
                          <p className="text-sm text-slate-700 italic mb-1">
                            "{interest.message}"
                          </p>
                        )}
                        <p className="text-xs text-slate-500">{formatDate(interest.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(interests?.totalPages ?? 0) > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                    <span className="text-xs text-slate-600">
                      Page {(interests?.number ?? 0) + 1} of {interests?.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={interestPage === 0}
                        onClick={() => setInterestPage(Math.max(0, interestPage - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(interestPage + 1) >= (interests?.totalPages ?? 0)}
                        onClick={() => setInterestPage(interestPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocks Tab */}
          <TabsContent value="blocks" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Block Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Search emails
                    </Label>
                    <Input
                      placeholder="Search by email..."
                      value={blockSearch}
                      onChange={(e) => {
                        setBlockSearch(e.target.value);
                        setBlockPage(0);
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">
                  Active Blocks{" "}
                  {blocks && <span className="text-slate-500 font-normal">({blocks.totalElements})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blocksLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (blocks?.content ?? []).length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No active blocks</p>
                ) : (
                  <div className="space-y-2">
                    {blocks?.content.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span className="font-semibold text-slate-900 truncate">
                              {block.ownerEmail}
                            </span>
                            <span className="text-slate-400">blocked</span>
                            <span className="font-semibold text-slate-900 truncate">
                              {block.blockedEmail}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(block.createdAt)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actingId === block.id}
                          onClick={() => {
                            setBlockToUnblock(block);
                            setUnblockDialog(true);
                          }}
                        >
                          {actingId === block.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(blocks?.totalPages ?? 0) > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                    <span className="text-xs text-slate-600">
                      Page {(blocks?.number ?? 0) + 1} of {blocks?.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={blockPage === 0}
                        onClick={() => setBlockPage(Math.max(0, blockPage - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(blockPage + 1) >= (blocks?.totalPages ?? 0)}
                        onClick={() => setBlockPage(blockPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Unblock Confirmation Dialog */}
        <AlertDialog open={unblockDialog} onOpenChange={setUnblockDialog}>
          <AlertDialogContent>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Remove Block
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will allow {blockToUnblock?.blockedEmail} to see content from{" "}
              {blockToUnblock?.ownerEmail} again. Continue?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (blockToUnblock) {
                    unblockMutation.mutate(blockToUnblock);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
