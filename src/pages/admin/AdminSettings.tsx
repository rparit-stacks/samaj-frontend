import React, { useState, useEffect } from "react";
import {
  Mail,
  Save,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  Power,
  Image as ImageIcon,
  HardDrive,
  FileText,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminSettingsApi,
  type SmtpConfigDto,
  type MaintenanceModeDto,
  type StorageConfigDto,
  type CmsMobileBannerDto,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettingsApi.getAll,
  });

  // Form States
  const [smtpForm, setSmtpForm] = useState<SmtpConfigDto | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceModeDto | null>(null);
  const [storageForm, setStorageForm] = useState<StorageConfigDto | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<CmsMobileBannerDto> | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [smtpErrors, setSmtpErrors] = useState<Record<string, string>>({});
  const [storageErrors, setStorageErrors] = useState<Record<string, string>>({});

  // Dirty state tracking
  const [dirtySmtp, setDirtySmtp] = useState(false);
  const [dirtyMaintenance, setDirtyMaintenance] = useState(false);
  const [dirtyStorage, setDirtyStorage] = useState(false);

  useEffect(() => {
    if (settings) {
      if (!smtpForm) setSmtpForm(settings.smtp);
      if (!maintenanceForm) setMaintenanceForm(settings.maintenanceMode);
      if (!storageForm) setStorageForm(settings.storageConfig);
    }
  }, [settings]);

  // Mutations
  const updateSmtpMutation = useMutation({
    mutationFn: (data: SmtpConfigDto) => adminSettingsApi.updateSmtp(data),
    onSuccess: () => {
      toast.success("SMTP settings saved");
      setDirtySmtp(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: (data: MaintenanceModeDto) => adminSettingsApi.updateMaintenanceMode(data),
    onSuccess: () => {
      toast.success("Maintenance mode updated");
      setDirtyMaintenance(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  const updateStorageMutation = useMutation({
    mutationFn: (data: Partial<StorageConfigDto>) => adminSettingsApi.updateStorageConfig(data),
    onSuccess: () => {
      toast.success("Storage configuration updated");
      setDirtyStorage(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  const createBannerMutation = useMutation({
    mutationFn: (data: Omit<CmsMobileBannerDto, "id" | "createdAt" | "updatedAt" | "active">) =>
      adminSettingsApi.createBanner(data),
    onSuccess: () => {
      toast.success("Banner created");
      setBannerForm(null);
      setBannerDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["banners", "active"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create"),
  });

  const updateBannerMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CmsMobileBannerDto>;
    }) => adminSettingsApi.updateBanner(id, data),
    onSuccess: () => {
      toast.success("Banner updated");
      setEditingBannerId(null);
      setBannerForm(null);
      setBannerDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["banners", "active"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update"),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => adminSettingsApi.deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner deleted");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["banners", "active"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete"),
  });

  // Validations
  const validateSmtp = (): boolean => {
    const errors: Record<string, string> = {};
    if (!smtpForm?.host?.trim()) errors.host = "Host is required";
    else if (!/^[a-zA-Z0-9.-]+$/.test(smtpForm.host)) errors.host = "Invalid host format";

    if (!smtpForm?.port || smtpForm.port < 1 || smtpForm.port > 65535)
      errors.port = "Port must be 1-65535";

    if (!smtpForm?.fromEmail?.trim()) errors.fromEmail = "From email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpForm.fromEmail))
      errors.fromEmail = "Invalid email format";

    setSmtpErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStorage = (): boolean => {
    const errors: Record<string, string> = {};
    if (storageForm?.provider === "S3") {
      if (!storageForm.s3Bucket?.trim()) errors.s3Bucket = "S3 bucket is required";
      if (!storageForm.s3Region?.trim()) errors.s3Region = "S3 region is required";
    }
    setStorageErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSmtp = () => {
    if (!smtpForm || !validateSmtp()) return;
    updateSmtpMutation.mutate(smtpForm);
  };

  const handleSaveMaintenance = () => {
    if (!maintenanceForm) return;
    updateMaintenanceMutation.mutate(maintenanceForm);
  };

  const handleSaveStorage = () => {
    if (!storageForm || !validateStorage()) return;
    updateStorageMutation.mutate(storageForm);
  };

  const handleSaveBanner = () => {
    if (!bannerForm) return;
    if (!bannerForm.title || !bannerForm.imageUrl || !bannerForm.redirectType || !bannerForm.redirectTarget) {
      toast.error("All banner fields are required");
      return;
    }

    if (editingBannerId) {
      updateBannerMutation.mutate({
        id: editingBannerId,
        data: bannerForm,
      });
    } else {
      createBannerMutation.mutate(
        bannerForm as Omit<CmsMobileBannerDto, "id" | "createdAt" | "updatedAt" | "active">
      );
    }
  };

  const openBannerEdit = (banner: CmsMobileBannerDto) => {
    setBannerForm(banner);
    setEditingBannerId(banner.id);
    setBannerDialogOpen(true);
  };

  const openBannerCreate = () => {
    setBannerForm({
      title: "",
      imageUrl: "",
      redirectType: "INTERNAL",
      redirectTarget: "",
      displayOrder: (settings?.cmsBanners?.length ?? 0) + 1,
    });
    setEditingBannerId(null);
    setBannerDialogOpen(true);
  };

  if (settingsLoading || !settings) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-slate-600 mt-1">Loading...</p>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-600 mt-1">
            Manage SMTP, maintenance mode, storage, and CMS banners
          </p>
        </div>

        <Tabs defaultValue="smtp" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="smtp" className="flex items-center gap-2 text-xs sm:text-sm">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">SMTP</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2 text-xs sm:text-sm">
              <Power className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2 text-xs sm:text-sm">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center gap-2 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Banners</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* SMTP Tab */}
          <TabsContent value="smtp" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMTP Configuration</CardTitle>
                    <CardDescription>
                      Configure email settings for sending notifications
                    </CardDescription>
                  </div>
                  {settings.smtp.configured && (
                    <Badge className="bg-green-100 text-green-800">Configured</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {smtpForm && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp-host">SMTP Host *</Label>
                        <Input
                          id="smtp-host"
                          value={smtpForm.host}
                          onChange={(e) => {
                            setSmtpForm({ ...smtpForm, host: e.target.value });
                            setDirtySmtp(true);
                          }}
                          placeholder="mail.example.com"
                          className={`mt-1 ${smtpErrors.host ? "border-red-500" : ""}`}
                        />
                        {smtpErrors.host && (
                          <p className="text-red-500 text-sm mt-1">{smtpErrors.host}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="smtp-port">SMTP Port *</Label>
                        <Input
                          id="smtp-port"
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => {
                            setSmtpForm({
                              ...smtpForm,
                              port: parseInt(e.target.value),
                            });
                            setDirtySmtp(true);
                          }}
                          placeholder="587"
                          className={`mt-1 ${smtpErrors.port ? "border-red-500" : ""}`}
                        />
                        {smtpErrors.port && (
                          <p className="text-red-500 text-sm mt-1">{smtpErrors.port}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtp-username">Username</Label>
                        <Input
                          id="smtp-username"
                          value={smtpForm.username}
                          onChange={(e) => {
                            setSmtpForm({
                              ...smtpForm,
                              username: e.target.value,
                            });
                            setDirtySmtp(true);
                          }}
                          placeholder="your-email@example.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp-from-email">From Email *</Label>
                        <Input
                          id="smtp-from-email"
                          type="email"
                          value={smtpForm.fromEmail}
                          onChange={(e) => {
                            setSmtpForm({
                              ...smtpForm,
                              fromEmail: e.target.value,
                            });
                            setDirtySmtp(true);
                          }}
                          placeholder="noreply@example.com"
                          className={`mt-1 ${smtpErrors.fromEmail ? "border-red-500" : ""}`}
                        />
                        {smtpErrors.fromEmail && (
                          <p className="text-red-500 text-sm mt-1">{smtpErrors.fromEmail}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="smtp-from-name">From Name</Label>
                      <Input
                        id="smtp-from-name"
                        value={smtpForm.fromName}
                        onChange={(e) => {
                          setSmtpForm({
                            ...smtpForm,
                            fromName: e.target.value,
                          });
                          setDirtySmtp(true);
                        }}
                        placeholder="Samaj"
                        className="mt-1"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSaveSmtp}
                        disabled={updateSmtpMutation.isPending || !dirtySmtp}
                        className="gap-2"
                      >
                        {updateSmtpMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save SMTP Settings
                          </>
                        )}
                      </Button>
                      {dirtySmtp && !updateSmtpMutation.isPending && (
                        <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Mode Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>
                  Temporarily disable the application for users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {maintenanceForm && (
                  <>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={maintenanceForm.enabled}
                        onCheckedChange={(checked) => {
                          setMaintenanceForm({
                            ...maintenanceForm,
                            enabled: checked,
                          });
                          setDirtyMaintenance(true);
                        }}
                      />
                      <div>
                        <p className="font-medium">
                          {maintenanceForm.enabled ? "Enabled" : "Disabled"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {maintenanceForm.enabled
                            ? "The site is currently in maintenance mode"
                            : "The site is active"}
                        </p>
                      </div>
                    </div>

                    {maintenanceForm.enabled && (
                      <>
                        <div>
                          <Label htmlFor="maintenance-message">Message</Label>
                          <Textarea
                            id="maintenance-message"
                            value={maintenanceForm.message || ""}
                            onChange={(e) => {
                              setMaintenanceForm({
                                ...maintenanceForm,
                                message: e.target.value,
                              });
                              setDirtyMaintenance(true);
                            }}
                            placeholder="The system is under maintenance. Please check back later."
                            className="mt-1 min-h-24"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            This message will be displayed to users
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="maintenance-end-time">End Time (Optional)</Label>
                          <Input
                            id="maintenance-end-time"
                            type="datetime-local"
                            value={
                              maintenanceForm.endTime
                                ? maintenanceForm.endTime.slice(0, 16)
                                : ""
                            }
                            onChange={(e) => {
                              setMaintenanceForm({
                                ...maintenanceForm,
                                endTime: e.target.value ? new Date(e.target.value).toISOString() : null,
                              });
                              setDirtyMaintenance(true);
                            }}
                            className="mt-1"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Leave empty to manually disable maintenance mode
                          </p>
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSaveMaintenance}
                        disabled={updateMaintenanceMutation.isPending || !dirtyMaintenance}
                        className="gap-2"
                      >
                        {updateMaintenanceMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Maintenance Settings
                          </>
                        )}
                      </Button>
                      {dirtyMaintenance && !updateMaintenanceMutation.isPending && (
                        <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Config Tab */}
          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Storage Configuration</CardTitle>
                <CardDescription>
                  Manage file storage settings (S3 or Local)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {storageForm && (
                  <>
                    <div>
                      <Label htmlFor="storage-provider">Storage Provider</Label>
                      <Select
                        value={storageForm.provider}
                        onValueChange={(value) => {
                          setStorageForm({ ...storageForm, provider: value });
                          setDirtyStorage(true);
                        }}
                      >
                        <SelectTrigger id="storage-provider" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOCAL">Local Storage</SelectItem>
                          <SelectItem value="S3">Amazon S3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {storageForm.provider === "S3" && (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="s3-bucket">S3 Bucket *</Label>
                            <Input
                              id="s3-bucket"
                              value={storageForm.s3Bucket}
                              onChange={(e) => {
                                setStorageForm({
                                  ...storageForm,
                                  s3Bucket: e.target.value,
                                });
                                setDirtyStorage(true);
                              }}
                              placeholder="my-bucket"
                              className={`mt-1 ${storageErrors.s3Bucket ? "border-red-500" : ""}`}
                            />
                            {storageErrors.s3Bucket && (
                              <p className="text-red-500 text-sm mt-1">{storageErrors.s3Bucket}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="s3-region">S3 Region *</Label>
                            <Input
                              id="s3-region"
                              value={storageForm.s3Region}
                              onChange={(e) => {
                                setStorageForm({
                                  ...storageForm,
                                  s3Region: e.target.value,
                                });
                                setDirtyStorage(true);
                              }}
                              placeholder="us-east-1"
                              className={`mt-1 ${storageErrors.s3Region ? "border-red-500" : ""}`}
                            />
                            {storageErrors.s3Region && (
                              <p className="text-red-500 text-sm mt-1">{storageErrors.s3Region}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="s3-public-url">Public Base URL</Label>
                          <Input
                            id="s3-public-url"
                            value={storageForm.s3PublicBaseUrl}
                            onChange={(e) => {
                              setStorageForm({
                                ...storageForm,
                                s3PublicBaseUrl: e.target.value,
                              });
                              setDirtyStorage(true);
                            }}
                            placeholder="https://cdn.example.com"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="s3-endpoint">Endpoint (Optional)</Label>
                          <Input
                            id="s3-endpoint"
                            value={storageForm.s3Endpoint}
                            onChange={(e) => {
                              setStorageForm({
                                ...storageForm,
                                s3Endpoint: e.target.value,
                              });
                              setDirtyStorage(true);
                            }}
                            placeholder="https://s3.amazonaws.com"
                            className="mt-1"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            For custom S3-compatible services
                          </p>
                        </div>
                      </>
                    )}

                    {storageForm.provider === "LOCAL" && (
                      <>
                        <div>
                          <Label htmlFor="local-root">Local Storage Root</Label>
                          <Input
                            id="local-root"
                            value={storageForm.localRoot}
                            onChange={(e) => {
                              setStorageForm({
                                ...storageForm,
                                localRoot: e.target.value,
                              });
                              setDirtyStorage(true);
                            }}
                            placeholder="/var/samaj/storage"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="local-public-url">Public Base URL</Label>
                          <Input
                            id="local-public-url"
                            value={storageForm.localPublicBaseUrl}
                            onChange={(e) => {
                              setStorageForm({
                                ...storageForm,
                                localPublicBaseUrl: e.target.value,
                              });
                              setDirtyStorage(true);
                            }}
                            placeholder="https://example.com/uploads"
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSaveStorage}
                        disabled={updateStorageMutation.isPending || !dirtyStorage}
                        className="gap-2"
                      >
                        {updateStorageMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Storage Configuration
                          </>
                        )}
                      </Button>
                      {dirtyStorage && !updateStorageMutation.isPending && (
                        <p className="text-sm text-amber-600 mt-2">You have unsaved changes</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openBannerCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Banner
              </Button>
            </div>

            {settings?.cmsBanners && settings.cmsBanners.length > 0 ? (
              <div className="grid gap-4">
                {settings.cmsBanners.map((banner) => (
                  <Card key={banner.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {banner.imageUrl && (
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-24 h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{banner.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {banner.redirectType} → {banner.redirectTarget}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={banner.active ? "default" : "secondary"}>
                              {banner.active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">Order: {banner.displayOrder}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBannerEdit(banner)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(banner.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-slate-600 text-center">No banners yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  View all configuration changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-slate-600">
                  <p className="text-sm">Audit logging is enabled. All configuration changes are recorded with timestamp, admin user, and IP address.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Banner Dialog */}
        <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBannerId ? "Edit Banner" : "Create Banner"}
              </DialogTitle>
              <DialogDescription>
                {editingBannerId
                  ? "Update the banner details"
                  : "Add a new mobile banner to the CMS"}
              </DialogDescription>
            </DialogHeader>

            {bannerForm && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banner-title">Title *</Label>
                  <Input
                    id="banner-title"
                    value={bannerForm.title || ""}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, title: e.target.value })
                    }
                    placeholder="Banner title"
                    className="mt-1"
                  />
                </div>

                <ImageUrlWithUpload
                  id="banner-image"
                  label="Banner image"
                  value={bannerForm.imageUrl || ""}
                  onChange={(url) => setBannerForm({ ...bannerForm, imageUrl: url })}
                  folder="cms-banners"
                  auth="admin"
                  helperText="Upload goes to Cloudinary when configured, otherwise your app storage."
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="banner-type">Redirect Type *</Label>
                    <Select
                      value={bannerForm.redirectType}
                      onValueChange={(value) =>
                        setBannerForm({
                          ...bannerForm,
                          redirectType: value as "INTERNAL" | "EXTERNAL",
                        })
                      }
                    >
                      <SelectTrigger id="banner-type" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">Internal Service</SelectItem>
                        <SelectItem value="EXTERNAL">External URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="banner-target">
                      {bannerForm.redirectType === "EXTERNAL"
                        ? "External URL"
                        : "Service Path"}{" "}
                      *
                    </Label>
                    <Input
                      id="banner-target"
                      value={bannerForm.redirectTarget || ""}
                      onChange={(e) =>
                        setBannerForm({
                          ...bannerForm,
                          redirectTarget: e.target.value,
                        })
                      }
                      placeholder={
                        bannerForm.redirectType === "EXTERNAL"
                          ? "https://example.com"
                          : "/matrimony"
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="banner-order">Display Order</Label>
                  <Input
                    id="banner-order"
                    type="number"
                    value={bannerForm.displayOrder || 0}
                    onChange={(e) =>
                      setBannerForm({
                        ...bannerForm,
                        displayOrder: parseInt(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBannerDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBanner}
                disabled={
                  createBannerMutation.isPending ||
                  updateBannerMutation.isPending
                }
              >
                {editingBannerId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this banner? This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) deleteBannerMutation.mutate(deleteConfirm);
              }}
              disabled={deleteBannerMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBannerMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
