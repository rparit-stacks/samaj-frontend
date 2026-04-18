import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap, Calendar, Clock, ExternalLink,
  Bell, CheckCircle, Share2, Bookmark, Loader2, AlertCircle, ListChecks, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { examsApi, type ExamDto } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ExamPaperDocument } from "@/types/examPaper";

interface ExamDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: ExamDto;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateWithDay(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ExamDetailDialog({ open, onOpenChange, exam }: ExamDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("No exam");
      if (exam.saved) return examsApi.unsave(exam.id);
      return examsApi.save(exam.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({
        title: exam?.saved ? "Removed from saved" : "Added to saved exams",
      });
    },
    onError: (e) => {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const alertMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("No exam");
      if (exam.alertEnabled) return examsApi.disableAlert(exam.id);
      return examsApi.enableAlert(exam.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({
        title: exam?.alertEnabled ? "Alert disabled" : "Alert enabled",
        description: "You'll receive notifications about this exam",
      });
    },
    onError: (e) => {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  if (!exam) return null;

  const daysLeft = daysUntil(exam.lastDate);
  const isClosing = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isClosed = daysLeft !== null && daysLeft <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.25rem)] max-w-[calc(100vw-1.25rem)] sm:max-w-2xl sm:w-full max-h-[min(90vh,100dvh)] overflow-y-auto overflow-x-hidden p-4 pb-safe-bottom sm:p-6 rounded-xl sm:rounded-lg gap-0 sm:gap-4">
        {/* Header */}
        <div className="space-y-3">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-start gap-3 text-lg sm:text-xl">
              <GraduationCap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="leading-tight">{exam.title}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {exam.type}
            </Badge>
            {exam.expired && (
              <Badge className="bg-red-100 text-red-700">Expired</Badge>
            )}
            {isClosing && !isClosed && daysLeft && (
              <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {daysLeft} days left
              </Badge>
            )}
            {isClosed && (
              <Badge className="bg-gray-100 text-gray-700">Closed</Badge>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Important Dates - Enhanced */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 space-y-4 border border-primary/10">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              Important Dates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-white rounded-lg border border-primary/5">
                <p className="text-muted-foreground text-xs font-medium mb-1">NOTIFICATION</p>
                <p className="font-semibold">{formatDate(exam.notificationDate)}</p>
              </div>
              <div className={cn(
                "p-3 bg-white rounded-lg border",
                isClosed ? "border-gray-200" : isClosing ? "border-amber-200 bg-amber-50" : "border-destructive/20 bg-destructive/5"
              )}>
                <p className={cn(
                  "text-xs font-medium mb-1",
                  isClosed ? "text-muted-foreground" : isClosing ? "text-amber-700" : "text-destructive"
                )}>
                  LAST DATE {isClosing && daysLeft && `(${daysLeft}d)`}
                </p>
                <p className={cn(
                  "font-semibold",
                  isClosed ? "text-muted-foreground" : isClosing ? "text-amber-700" : "text-destructive"
                )}>
                  {formatDateWithDay(exam.lastDate)}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-primary/5">
                <p className="text-muted-foreground text-xs font-medium mb-1">EXAM DATE</p>
                <p className="font-semibold">{formatDate(exam.examDate)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">About Exam</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exam.description}
            </p>
          </div>

          {/* Eligibility */}
          {exam.eligibility && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                Eligibility Criteria
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {exam.eligibility}
              </p>
            </div>
          )}

          {/* Application Link */}
          {exam.applyUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <p className="font-medium mb-1">Official Website</p>
              <a
                href={exam.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline break-all text-xs"
              >
                {exam.applyUrl}
              </a>
            </div>
          )}

          {(() => {
            const paper = exam.paper as ExamPaperDocument | undefined;
            if (!paper?.sections?.length) return null;
            return (
              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Paper outline
                </h4>
                <p className="text-xs text-muted-foreground">
                  Sections and question types defined by administrators (preview).
                </p>
                <div className="space-y-2">
                  {paper.sections.map((sec) => (
                    <Collapsible key={sec.id} defaultOpen={paper.sections.length <= 2} className="group">
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
                        <span className="truncate pr-2">{sec.title || "Untitled section"}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 pl-1 space-y-2">
                        {sec.description ? (
                          <p className="text-xs text-muted-foreground px-2">{sec.description}</p>
                        ) : null}
                        <ul className="space-y-1.5 px-2 pb-2">
                          {(sec.questions ?? []).map((q) => (
                            <li key={q.id} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
                              <span className="font-medium text-foreground/90">{q.type}</span>
                              <span className="mx-1">·</span>
                              <span>{q.prompt || "(No prompt)"}</span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Time Left</p>
              <p className="font-semibold text-sm">
                {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days` : "—"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <GraduationCap className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Exam Type</p>
              <p className="font-semibold text-sm capitalize">{exam.type}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              asChild
              disabled={!exam.applyUrl || isClosed}
              size="lg"
            >
              <a href={exam.applyUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {isClosed ? "Applications Closed" : "Apply Now"}
              </a>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={exam.saved ? "default" : "outline"}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Bookmark className={cn("h-4 w-4 mr-2", exam.saved && "fill-current")} />
                    {exam.saved ? "Saved" : "Save"}
                  </>
                )}
              </Button>

              <Button
                variant={exam.alertEnabled ? "default" : "outline"}
                onClick={() => alertMutation.mutate()}
                disabled={alertMutation.isPending}
                className="w-full"
              >
                {alertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Bell className={cn("h-4 w-4 mr-2", exam.alertEnabled && "fill-current")} />
                    {exam.alertEnabled ? "Alert On" : "Alert"}
                  </>
                )}
              </Button>
            </div>

            <Button variant="outline" className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
