import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Check, X, HelpCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RSVPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle?: string;
}

type RSVPStatus = "going" | "maybe" | "not-going" | null;

export function RSVPDialog({ open, onOpenChange, eventTitle = "Annual Gathering 2026" }: RSVPDialogProps) {
  const [status, setStatus] = useState<RSVPStatus>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!status) return;
    
    toast({
      title: "RSVP Confirmed!",
      description: status === "going" 
        ? `You're attending with ${guestCount} guest(s).`
        : status === "maybe"
        ? "You've marked as maybe."
        : "Your response has been recorded.",
    });
    
    onOpenChange(false);
  };

  const rsvpOptions = [
    { id: "going", label: "Going", icon: Check, color: "text-success border-success bg-success/10" },
    { id: "maybe", label: "Maybe", icon: HelpCircle, color: "text-warning border-warning bg-warning/10" },
    { id: "not-going", label: "Can't Go", icon: X, color: "text-destructive border-destructive bg-destructive/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            RSVP
          </DialogTitle>
          <DialogDescription>
            {eventTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* RSVP Status */}
          <div className="space-y-2">
            <Label>Will you attend?</Label>
            <div className="grid grid-cols-3 gap-2">
              {rsvpOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setStatus(option.id as RSVPStatus)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    status === option.id 
                      ? option.color
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <option.icon className={cn(
                    "h-6 w-6",
                    status === option.id ? "" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    status !== option.id && "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Guest Count (only if going) */}
          {status === "going" && (
            <div className="space-y-2">
              <Label htmlFor="guest-count">Number of Guests (including you)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="guest-count"
                  type="number"
                  min="1"
                  max="10"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="rsvp-note">Add a note (optional)</Label>
            <Textarea 
              id="rsvp-note"
              placeholder="Any dietary restrictions or special requests..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!status}
            variant={status === "going" ? "success" : status === "not-going" ? "destructive" : "default"}
          >
            Confirm RSVP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
