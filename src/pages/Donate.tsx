import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, IndianRupee, CheckCircle2, Clock, XCircle, Loader2, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { donationApi, type DonationItemDto } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

const PRESET_AMOUNTS = [51, 101, 251, 501, 1001, 2001];

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway"));
    document.head.appendChild(script);
  });
}

function formatAmount(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

function statusBadge(status: DonationItemDto["status"]) {
  if (status === "SUCCESS") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
  if (status === "FAILED") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

export default function Donate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["donation", "config"],
    queryFn: donationApi.config,
  });

  const { data: myDonations, isLoading: historyLoading } = useQuery({
    queryKey: ["donation", "my"],
    queryFn: () => donationApi.myDonations({ size: 20 }),
  });

  const verifyMutation = useMutation({
    mutationFn: donationApi.verifyPayment,
    onSuccess: () => {
      toast.success("Thank you for your donation! Your support means a lot.");
      qc.invalidateQueries({ queryKey: ["donation", "my"] });
      setSelectedPreset(null);
      setCustomAmount("");
      setNotes("");
    },
    onError: () => toast.error("Payment verification failed. Please contact support."),
  });

  const getAmountRupees = (): number => {
    if (selectedPreset !== null) return selectedPreset;
    const parsed = parseFloat(customAmount.replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const amountRupees = getAmountRupees();
  const amountPaise = Math.round(amountRupees * 100);

  const minRupees = config ? config.minAmountPaise / 100 : 50;
  const maxRupees = config ? config.maxAmountPaise / 100 : 100000;

  const amountValid = amountRupees >= minRupees && amountRupees <= maxRupees;
  const canDonate = config?.enabled && config.keyId && amountValid && !paying;

  const handleDonate = useCallback(async () => {
    if (!canDonate || !config) return;
    setPaying(true);
    try {
      await loadRazorpayScript();
      const order = await donationApi.createOrder(amountPaise, notes || undefined);
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.orderId,
        name: "Samaj Community",
        description: "Community Donation",
        prefill: {
          name: (user?.metadata?.name as string) ?? undefined,
          contact: user?.phone ?? undefined,
        },
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          await verifyMutation.mutateAsync({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            notes: notes || undefined,
          });
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info("Payment cancelled");
          },
        },
      });
      rzp.open();
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not start payment");
    }
  }, [canDonate, config, amountPaise, notes, user, verifyMutation]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-purple-50 to-pink-50 dark:from-primary/20 dark:via-purple-950/20 dark:to-pink-950/20 p-6 text-center border border-primary/10">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <HandCoins className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Support Our Samaj</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Your contribution helps us maintain and grow this platform for our entire community.
            Every donation, big or small, makes a difference.
          </p>
        </div>

        {/* Donation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Choose Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {configLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-10" />)}
                </div>
                <Skeleton className="h-10" />
              </div>
            ) : !config?.enabled ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Donations are not available right now</p>
                <p className="text-sm mt-1">Please check back later</p>
              </div>
            ) : (
              <>
                {/* Preset amount grid */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedPreset(amount);
                        setCustomAmount("");
                      }}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-medium transition-all",
                        selectedPreset === amount
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background hover:bg-muted border-input text-foreground"
                      )}
                    >
                      ₹{amount.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div>
                  <Label htmlFor="custom-amount">Custom Amount (₹)</Label>
                  <div className="relative mt-1">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="custom-amount"
                      type="number"
                      min={minRupees}
                      max={maxRupees}
                      step="1"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedPreset(null);
                      }}
                      placeholder={`${minRupees} – ${maxRupees.toLocaleString("en-IN")}`}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min ₹{minRupees.toLocaleString("en-IN")} · Max ₹{maxRupees.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Note */}
                <div>
                  <Label htmlFor="notes">Message (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share a message with your donation..."
                    className="mt-1 min-h-[80px] resize-none"
                    maxLength={500}
                  />
                </div>

                {/* Amount preview + donate button */}
                <div className="pt-2 border-t space-y-3">
                  {amountRupees > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Donation amount</span>
                      <span className={cn("font-semibold text-base", amountValid ? "text-green-600" : "text-red-500")}>
                        ₹{amountRupees.toLocaleString("en-IN")}
                        {!amountValid && (
                          <span className="ml-2 text-xs font-normal">
                            (must be ₹{minRupees}–₹{maxRupees.toLocaleString("en-IN")})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={handleDonate}
                    disabled={!canDonate}
                    className="w-full h-11 text-base gap-2"
                    size="lg"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Heart className="h-5 w-5" />
                        Donate{amountValid ? ` ₹${amountRupees.toLocaleString("en-IN")}` : ""}
                      </>
                    )}
                  </Button>
                  {!config.keyId && (
                    <p className="text-xs text-center text-muted-foreground">
                      Payment gateway is not configured yet
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Donation History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Donation History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : !myDonations?.content.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No donations yet. Be the first to contribute!
              </p>
            ) : (
              <div className="space-y-2">
                {myDonations.content.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{formatAmount(d.amountPaise)}</p>
                      {d.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{d.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div>{statusBadge(d.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
