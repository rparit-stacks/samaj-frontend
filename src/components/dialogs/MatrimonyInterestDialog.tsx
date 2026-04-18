import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Heart, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { matrimonyApi } from "@/lib/api";

interface MatrimonyInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** My active matrimony profile id */
  fromProfileId: string;
  toProfileId?: string;
  profile?: {
    name: string;
    avatar?: string;
    age: number;
    profession: string;
    city: string;
  };
  onSuccess?: () => void;
}

export function MatrimonyInterestDialog({
  open,
  onOpenChange,
  fromProfileId,
  toProfileId,
  profile,
  onSuccess,
}: MatrimonyInterestDialogProps) {
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"interest" | "success">("interest");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () =>
      matrimonyApi.sendInterest({
        fromProfileId,
        toProfileId: toProfileId!,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      setStep("success");
      onSuccess?.();
      void queryClient.invalidateQueries({ queryKey: ["matrimony-interests"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not send", description: err.message, variant: "destructive" });
    },
  });

  const handleSendInterest = () => {
    if (!toProfileId || !fromProfileId) return;
    sendMutation.mutate();
  };

  const handleClose = () => {
    setStep("interest");
    setMessage("");
    onOpenChange(false);
  };

  if (!profile || !toProfileId) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "interest" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Send Interest
              </DialogTitle>
              <DialogDescription>Show interest in this profile</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.age} years • {profile.profession}
                  </p>
                  <p className="text-sm text-muted-foreground">{profile.city}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-message">Message (optional)</Label>
                <Textarea
                  id="interest-message"
                  placeholder="Brief introduction about yourself…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInterest}
                disabled={sendMutation.isPending}
                className="bg-pink-500 hover:bg-pink-600 gap-2"
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                Send Interest
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Interest sent</h3>
                <p className="text-muted-foreground mt-1">
                  Your interest was sent to {profile.name}. You’ll be notified when they respond.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2" onClick={handleClose}>
                <MessageCircle className="h-4 w-4" />
                Close
              </Button>
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
