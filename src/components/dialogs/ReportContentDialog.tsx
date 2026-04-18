import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Flag, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { communityApi } from "@/lib/api";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType?: "post" | "comment" | "profile" | "photo";
  /** When reporting a post, pass postId so the report is sent to the backend */
  postId?: number | null;
}

const reportReasons = [
  { id: "spam", label: "Spam or misleading" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "false", label: "False information" },
  { id: "hate", label: "Hate speech" },
  { id: "other", label: "Other" },
];

export function ReportContentDialog({
  open,
  onOpenChange,
  contentType = "post",
  postId = null,
}: ReportContentDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      if (contentType === "post" && postId != null) {
        await communityApi.report(postId, { reason, details: details || undefined });
      }
      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });
      setReason("");
      setDetails("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Report failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            Report {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this {contentType}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label>Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons.map((r) => (
                <div key={r.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={r.id} id={r.id} />
                  <Label htmlFor={r.id} className="flex-1 cursor-pointer font-normal">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          {reason && (
            <div className="space-y-2">
              <Label htmlFor="report-details">Additional details (optional)</Label>
              <Textarea 
                id="report-details"
                placeholder="Provide any additional context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-3 text-sm text-muted-foreground flex gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>False reports may result in action against your account. Please only report genuine violations.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={!reason || submitting}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
