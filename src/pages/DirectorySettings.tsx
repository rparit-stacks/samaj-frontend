import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Phone,
  MessageCircle,
  Mail,
  Link as LinkIcon,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { directoryApi, type DirectoryActionDto, type DirectorySettings } from "@/lib/api";

const ACTION_TYPES = [
  { value: "CALL", label: "Phone Call", icon: <Phone className="h-4 w-4" /> },
  { value: "WHATSAPP", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  { value: "EMAIL", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "LINK", label: "Link / URL", icon: <LinkIcon className="h-4 w-4" /> },
];

function getPlaceholder(type: string): string {
  switch (type) {
    case "CALL": return "e.g. +91 9876543210";
    case "WHATSAPP": return "e.g. 9876543210";
    case "EMAIL": return "e.g. user@example.com";
    default: return "e.g. https://example.com";
  }
}

function getDefaultLabel(type: string): string {
  switch (type) {
    case "CALL": return "Call";
    case "WHATSAPP": return "WhatsApp";
    case "EMAIL": return "Email";
    default: return "Website";
  }
}

interface ActionRow {
  type: string;
  label: string;
  value: string;
}

export default function DirectorySettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["directory", "mySettings"],
    queryFn: () => directoryApi.getMySettings(),
  });

  const [visible, setVisible] = useState(true);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setVisible(settings.visible);
      setActions(
        settings.actions.map((a) => ({ type: a.type, label: a.label, value: a.value }))
      );
      setDirty(false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: DirectorySettings) => directoryApi.updateMySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      setDirty(false);
      toast({ title: "Settings saved", description: "Your directory preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload: DirectorySettings = {
      visible,
      actions: actions
        .filter((a) => a.value.trim())
        .map((a, i) => ({ type: a.type, label: a.label || getDefaultLabel(a.type), value: a.value.trim(), sortOrder: i })),
    };
    saveMutation.mutate(payload);
  };

  const addAction = () => {
    setActions([...actions, { type: "CALL", label: "Call", value: "" }]);
    setDirty(true);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateAction = (index: number, field: keyof ActionRow, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "type") {
      updated[index].label = getDefaultLabel(value);
    }
    setActions(updated);
    setDirty(true);
  };

  const moveAction = (from: number, to: number) => {
    if (to < 0 || to >= actions.length) return;
    const updated = [...actions];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setActions(updated);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <AppLayout title="Directory Settings">
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
          <div className="h-10 bg-muted/60 rounded animate-pulse" />
          <div className="h-40 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-60 bg-muted/60 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Directory Settings">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/directory">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Directory Settings</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        {/* Visibility */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {visible ? (
                  <Eye className="h-5 w-5 text-green-600" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {visible ? "Visible in Directory" : "Hidden from Directory"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {visible
                      ? "Other members can see your profile in the directory."
                      : "Your profile will not appear in the directory list."}
                  </p>
                </div>
              </div>
              <Switch
                checked={visible}
                onCheckedChange={(v) => { setVisible(v); setDirty(true); }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Action Buttons</CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={addAction}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These buttons appear on your directory card. Others can click them to call, WhatsApp, email, or visit a link.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No action buttons configured. Click "Add" to create one.
              </p>
            )}
            {actions.map((action, index) => (
              <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                <button
                  className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => moveAction(index, index - 1)}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="w-36">
                      <Select
                        value={action.type}
                        onValueChange={(v) => updateAction(index, "type", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                {t.icon}
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Button label"
                        value={action.label}
                        onChange={(e) => updateAction(index, "label", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Input
                    placeholder={getPlaceholder(action.type)}
                    value={action.value}
                    onChange={(e) => updateAction(index, "value", e.target.value)}
                    className="h-9"
                  />
                </div>
                <button
                  onClick={() => removeAction(index)}
                  className="mt-2 text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
