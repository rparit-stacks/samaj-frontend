import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Trash2,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Smartphone,
  Mail,
  Shield,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  authApi,
  notificationApi,
  userApi,
  type PrivacySettings,
  type ServicePrivacyOverrides,
} from "@/lib/api";
import { LEGAL } from "@/lib/legalConfig";

const SERVICE_LABELS: Record<keyof ServicePrivacyOverrides, string> = {
  showName: "Show my name",
  showEmail: "Show my email",
  showPhone: "Show my phone",
  showFamily: "Show family members",
  showLocation: "Show my location",
  showOnProfile: "Show on my profile",
};

function ServicePrivacySwitches({
  service,
  overrides,
  onUpdate,
}: {
  service: "events" | "community" | "emergency";
  overrides: ServicePrivacyOverrides;
  onUpdate: (next: ServicePrivacyOverrides) => void;
}) {
  const keys: (keyof ServicePrivacyOverrides)[] =
    service === "community"
      ? ["showOnProfile", "showName", "showEmail", "showPhone", "showFamily", "showLocation"]
      : ["showOnProfile", "showName", "showEmail", "showPhone", "showFamily"];
  return (
    <div className="space-y-4">
      {keys.map((key) => (
        <div key={key} className="flex items-center justify-between">
          <Label>{SERVICE_LABELS[key]}</Label>
          <Switch
            checked={overrides[key] ?? true}
            onCheckedChange={(checked) => onUpdate({ ...overrides, [key]: checked })}
          />
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: notificationApi.getPreferences,
  });

  const { data: privacy } = useQuery({
    queryKey: ["privacy"],
    queryFn: userApi.getPrivacy,
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: userApi.updatePrivacy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy"] });
      toast({ title: "Privacy saved", description: "Your privacy settings have been updated." });
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save privacy",
        variant: "destructive",
      });
    },
  });

  const updatePrefs = useMutation({
    mutationFn: notificationApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
      toast({ title: "Preferences saved", description: "Notification preferences updated." });
    },
  });

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "New password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessTokenExpiresAt");
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      navigate("/login");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  const location = useLocation();
  const hash = location.hash?.toLowerCase() || "";
  const defaultTab =
    hash === "#privacy" ? "privacy" : hash === "#account" ? "account" : "notifications";

  return (
    <AppLayout title="Settings">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-7 w-7 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full" key={defaultTab}>
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden md:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label>In-App Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive notifications in the app</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs?.inAppEnabled ?? true}
                    onCheckedChange={(checked) =>
                      updatePrefs.mutate({
                        emailEnabled: prefs?.emailEnabled ?? true,
                        inAppEnabled: checked,
                        securityEmailEnabled: prefs?.securityEmailEnabled ?? true,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs?.emailEnabled ?? true}
                    onCheckedChange={(checked) =>
                      updatePrefs.mutate({
                        emailEnabled: checked,
                        inAppEnabled: prefs?.inAppEnabled ?? true,
                        securityEmailEnabled: prefs?.securityEmailEnabled ?? true,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label>Security Emails</Label>
                      <p className="text-xs text-muted-foreground">Important security-related emails</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs?.securityEmailEnabled ?? true}
                    onCheckedChange={(checked) =>
                      updatePrefs.mutate({
                        emailEnabled: prefs?.emailEnabled ?? true,
                        inAppEnabled: prefs?.inAppEnabled ?? true,
                        securityEmailEnabled: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="mt-6 space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>Who can see your profile and basic info</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile visibility</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={privacy?.profileVisibility ?? "MEMBERS_ONLY"}
                    onChange={(e) =>
                      updatePrivacyMutation.mutate({
                        ...privacy,
                        profileVisibility: e.target.value as PrivacySettings["profileVisibility"],
                      })
                    }
                  >
                    <option value="PUBLIC">Everyone</option>
                    <option value="MEMBERS_ONLY">Members only</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show email on profile</Label>
                    <p className="text-xs text-muted-foreground">When others view your profile</p>
                  </div>
                  <Switch
                    checked={privacy?.showEmail ?? true}
                    onCheckedChange={(checked) =>
                      updatePrivacyMutation.mutate({ ...privacy, showEmail: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show phone on profile</Label>
                    <p className="text-xs text-muted-foreground">When others view your profile</p>
                  </div>
                  <Switch
                    checked={privacy?.showPhone ?? true}
                    onCheckedChange={(checked) =>
                      updatePrivacyMutation.mutate({ ...privacy, showPhone: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show blood group</Label>
                    <p className="text-xs text-muted-foreground">When others view your profile</p>
                  </div>
                  <Switch
                    checked={privacy?.showBloodGroup ?? true}
                    onCheckedChange={(checked) =>
                      updatePrivacyMutation.mutate({ ...privacy, showBloodGroup: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show family members</Label>
                    <p className="text-xs text-muted-foreground">When others view your profile</p>
                  </div>
                  <Switch
                    checked={privacy?.showFamilyMembers ?? true}
                    onCheckedChange={(checked) =>
                      updatePrivacyMutation.mutate({ ...privacy, showFamilyMembers: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {(["events", "community", "emergency"] as const).map((service) => (
              <Card key={service} className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {service === "events" && <Calendar className="h-5 w-5" />}
                    {service === "community" && <Users className="h-5 w-5" />}
                    {service === "emergency" && <AlertCircle className="h-5 w-5" />}
                    {service.charAt(0).toUpperCase() + service.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    What others see when you appear in {service} (e.g. event organizer, post author, emergency creator)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ServicePrivacySwitches
                    service={service}
                    overrides={privacy?.servicePrivacy?.[service] ?? {}}
                    onUpdate={(next) => {
                      const current = privacy?.servicePrivacy ?? {};
                      updatePrivacyMutation.mutate({
                        ...privacy,
                        servicePrivacy: { ...current, [service]: next },
                      });
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Change Password
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new password
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setChangePasswordOpen(false)} disabled={changing}>
                        Cancel
                      </Button>
                      <Button onClick={handleChangePassword} disabled={changing}>
                        {changing ? "Updating..." : "Update Password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Support</CardTitle>
                <CardDescription>Get help and contact us</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate("/help")}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help Center
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    window.location.href = `mailto:${LEGAL.support.email}`;
                  }}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contact Support
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate("/privacy")}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate("/terms")}
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Terms of Service
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate("/child-safety")}
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Child Safety Standards
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Permanently delete your account</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and
                        remove or anonymise your personal data from our servers within 30 days, as
                        described in our Privacy Policy. Shared community posts may be anonymised
                        rather than removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteAccount();
                        }}
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
