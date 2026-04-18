import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  achieversApi,
  type AchievementFieldItem,
  type AchievementFieldType,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, LayoutTemplate } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

const FIELD_TYPES: AchievementFieldType[] = ["TEXT", "LONG_TEXT", "DATE", "LINK", "IMAGE"];

function newField(partial?: Partial<AchievementFieldItem>): AchievementFieldItem {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    type: partial?.type ?? "TEXT",
    label: partial?.label ?? "",
    value: partial?.value ?? "",
  };
}

export default function AchievementForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [headline, setHeadline] = useState("");
  const [fields, setFields] = useState<AchievementFieldItem[]>([newField({ label: "Summary", type: "TEXT" })]);

  const { data: templates = [] } = useQuery({
    queryKey: ["achievers", "field-templates"],
    queryFn: achieversApi.fieldTemplates,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      achieversApi.create({
        headline: headline.trim(),
        fields: fields.map((f) => ({
          ...f,
          label: f.label.trim(),
          type: f.type.toUpperCase(),
          value: f.value ?? "",
        })),
      }),
    onSuccess: (res) => {
      toast.success("Submitted for review");
      qc.invalidateQueries({ queryKey: ["achievers"] });
      navigate(`/achievements/${res.id}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const applyTemplate = useCallback(
    (templateId: string) => {
      const t = templates.find((x) => x.id === templateId);
      if (!t) return;
      try {
        const raw = JSON.parse(t.schemaJson) as Array<{ type?: string; label?: string }>;
        if (!Array.isArray(raw) || raw.length === 0) {
          toast.error("Invalid template");
          return;
        }
        const next: AchievementFieldItem[] = raw.map((row) =>
          newField({
            type: (row.type as AchievementFieldType) || "TEXT",
            label: row.label || "Field",
            value: "",
          }),
        );
        setFields(next);
        toast.info(`Loaded template: ${t.name}`);
      } catch {
        toast.error("Could not parse template");
      }
    },
    [templates],
  );

  const updateField = (id: string, patch: Partial<AchievementFieldItem>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => (prev.length <= 1 ? prev : prev.filter((f) => f.id !== id)));
  };

  const canSubmit = useMemo(() => {
    if (!headline.trim()) return false;
    if (fields.some((f) => !f.label.trim())) return false;
    return true;
  }, [headline, fields]);

  return (
    <AppLayout title="Add achievement">
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5 pb-24">
        <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2 text-muted-foreground">
          <Link to="/achievements">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <div>
          <h1 className="text-xl font-bold">Add your achievement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build a custom story: add any fields you need (text, dates, links, images). An admin will review before it
            goes live.
          </p>
        </div>

        {templates.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Start from template
            </div>
            <Select onValueChange={(v) => applyTemplate(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reusable field layout…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="headline">Short headline (shown in marquee & lists)</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. State-level chess champion 2025"
            maxLength={200}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Dynamic fields</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8 gap-1"
              onClick={() => setFields((p) => [...p, newField({ label: "", type: "TEXT" })])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((f, idx) => (
              <div key={f.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Field {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeField(f.id)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={f.type} onValueChange={(v) => updateField(f.id, { type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={f.label}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                      placeholder="Field name"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {f.type === "IMAGE" ? (
                    <ImageUrlWithUpload
                      id={`achievement-field-${f.id}`}
                      label="Image"
                      optional
                      value={f.value}
                      onChange={(v) => updateField(f.id, { value: v })}
                      folder="achievements"
                      auth="user"
                      helperText="Upload or paste a direct image URL."
                      inputClassName="rounded-xl"
                    />
                  ) : (
                    <>
                      <Label className="text-xs">Value</Label>
                      {f.type === "LONG_TEXT" ? (
                        <Textarea
                          value={f.value}
                          onChange={(e) => updateField(f.id, { value: e.target.value })}
                          rows={4}
                          className="rounded-xl resize-y min-h-[100px]"
                          placeholder="Content…"
                        />
                      ) : f.type === "DATE" ? (
                        <Input
                          type="date"
                          value={f.value}
                          onChange={(e) => updateField(f.id, { value: e.target.value })}
                          className="rounded-xl"
                        />
                      ) : (
                        <Input
                          value={f.value}
                          onChange={(e) => updateField(f.id, { value: e.target.value })}
                          placeholder={f.type === "LINK" ? "https://…" : "Text…"}
                          className="rounded-xl"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border/60 md:static md:bg-transparent md:border-0 md:p-0">
          <div className="max-w-xl mx-auto flex gap-2">
            <Button className="flex-1 rounded-full" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                "Submit for review"
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
