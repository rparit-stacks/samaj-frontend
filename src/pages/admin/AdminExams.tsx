import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  GraduationCap,
  Calendar,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminExamApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const examTypeBadgeClass = (t: string) => {
  const key = t.toLowerCase();
  const map: Record<string, string> = {
    upsc: "bg-purple-100 text-purple-700 border-purple-200",
    ssc: "bg-blue-100 text-blue-700 border-blue-200",
    banking: "bg-green-100 text-green-700 border-green-200",
    state: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return map[key] ?? "bg-slate-100 text-slate-800 border-slate-200";
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminExams() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["admin", "exams", "list"],
    queryFn: () => adminExamApi.list({ page: 0, size: 100 }),
  });

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = exams?.content ?? [];
    if (!q) return list;
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }, [exams, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminExamApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      toast({ title: "Exam deleted successfully" });
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    },
    onError: (err) => {
      toast({
        title: "Failed to delete exam",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (examToDelete) {
      deleteMutation.mutate(examToDelete);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Exams & Scholarships</h1>
            <p className="text-slate-600">
              Manage listings and structured papers (sections, questions, options) in the editor.
            </p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" asChild>
            <Link to="/admin/exams/new">
              <Plus className="w-4 h-4 mr-2" />
              Create exam
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>No exams found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{exam.title}</h3>
                        {exam.expired && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">Expired</Badge>
                        )}
                        <Badge className={examTypeBadgeClass(exam.type)}>{exam.type}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{exam.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {exam.lastDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Last: {formatDate(exam.lastDate)}
                          </div>
                        )}
                        {exam.examDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Exam: {formatDate(exam.examDate)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                        <Link to={`/admin/exams/${exam.id}/edit`}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/exams/${exam.id}/edit`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit paper & details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setExamToDelete(exam.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The exam will be permanently removed from the system.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
