import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, ChevronLeft, Check, X, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userApi, chatApi, type ContactRequestResponse } from "@/lib/api";

function RequestRow({
  r,
  variant,
  onRespond,
  respondingId,
  onStartChat,
}: {
  r: ContactRequestResponse;
  variant: "incoming" | "outgoing";
  onRespond?: (id: string, approve: boolean) => void;
  respondingId?: string | null;
  onStartChat?: (userId: string) => void;
}) {
  const name = variant === "incoming" ? r.requesterName : r.targetName;
  const avatarUrl = variant === "incoming" ? r.requesterAvatarUrl : r.targetAvatarUrl;
  const userId = variant === "incoming" ? r.requesterUserId : r.targetUserId;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <Link to={`/user/${userId}`} className="font-medium hover:text-primary truncate block">
          {name}
        </Link>
        {r.message && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{r.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {variant === "outgoing" ? "You requested" : "Requested you"} · {new Date(r.createdAt).toLocaleDateString()}
        </p>
      </div>
      {variant === "incoming" && r.status === "PENDING" && onRespond && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={() => onRespond(r.id, true)}
            disabled={respondingId === r.id}
          >
            <Check className="h-4 w-4 mr-1" />
            {respondingId === r.id ? "…" : "Allow"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRespond(r.id, false)}
            disabled={respondingId === r.id}
          >
            <X className="h-4 w-4 mr-1" />
            Deny
          </Button>
        </div>
      )}
      {variant === "outgoing" && r.status !== "PENDING" && (
        <Badge variant={r.status === "APPROVED" ? "default" : "secondary"}>
          {r.status === "APPROVED" ? "Approved" : "Declined"}
        </Badge>
      )}
      {r.status === "APPROVED" && onStartChat && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 rounded-xl gap-1"
          onClick={() => onStartChat(userId)}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </Button>
      )}
    </div>
  );
}

export default function ContactRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleStartChat = async (otherUserId: string) => {
    try {
      const conv = await chatApi.openDirect(otherUserId);
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      toast({
        title: "Could not open chat",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    }
  };

  const { data: incoming = [], isLoading: loadingIncoming } = useQuery({
    queryKey: ["contactRequests", "incoming"],
    queryFn: () => userApi.getContactRequestsIncoming(),
  });

  const { data: outgoing = [], isLoading: loadingOutgoing } = useQuery({
    queryKey: ["contactRequests", "outgoing"],
    queryFn: () => userApi.getContactRequestsOutgoing(),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      userApi.respondContactRequest(id, approve),
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["contactRequests"] });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
      toast({
        title: approve ? "Request approved" : "Request declined",
        description: approve ? "They can now see your contact info." : "Request declined.",
      });
      setRespondingId(null);
    },
    onError: (err) => {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setRespondingId(null);
    },
  });

  const handleRespond = (id: string, approve: boolean) => {
    setRespondingId(id);
    respondMutation.mutate({ id, approve });
  };

  const pendingCount = incoming.filter((r) => r.status === "PENDING").length;

  return (
    <AppLayout title="Contact Requests">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-7 w-7 text-primary" />
              Contact Requests
            </h1>
            <p className="text-muted-foreground">
              Manage who can see your contact info
            </p>
          </div>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="space-y-4 mt-4">
            {loadingIncoming ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : incoming.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No contact requests yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <RequestRow
                    key={r.id}
                    r={r}
                    variant="incoming"
                    onRespond={handleRespond}
                    respondingId={respondingId}
                    onStartChat={(uid) => void handleStartChat(uid)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="outgoing" className="space-y-4 mt-4">
            {loadingOutgoing ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : outgoing.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  You haven't sent any contact requests.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <RequestRow
                    key={r.id}
                    r={r}
                    variant="outgoing"
                    onStartChat={(uid) => void handleStartChat(uid)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
