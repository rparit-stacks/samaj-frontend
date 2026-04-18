import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Layers,
  ListChecks,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { adminExamApi, type AdminExamCreateRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { validateExamPaper } from "@/lib/examPaperZod";
import type {
  ExamPaperCustomField,
  ExamPaperDocument,
  ExamPaperOption,
  ExamPaperQuestion,
  ExamPaperSection,
  ExamQuestionType,
} from "@/types/examPaper";
import {
  EXAM_QUESTION_TYPES,
  emptyPaper,
  newQuestion,
  newSection,
  defaultOptionsForType,
} from "@/types/examPaper";

/** Browser autocomplete suggestions — admins can type any exam category. */
const EXAM_TYPE_SUGGESTIONS = ["UPSC", "SSC", "Banking", "State PSC", "Railway", "Defence", "Teaching", "Scholarship"];

function sanitizePaper(doc: ExamPaperDocument): ExamPaperDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      ...s,
      customFields: (s.customFields ?? []).filter((r) => r.key.trim() && r.value.trim()),
      questions: s.questions.map((q) => ({
        ...q,
        customFields: (q.customFields ?? []).filter((r) => r.key.trim() && r.value.trim()),
      })),
    })),
  };
}

function CustomFieldsEditor({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: ExamPaperCustomField[];
  onChange: (next: ExamPaperCustomField[]) => void;
}) {
  const list = rows.length ? rows : [{ key: "", value: "" }];
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-medium text-slate-600">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange([...list, { key: "", value: "" }])}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add field
        </Button>
      </div>
      {list.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Field name"
            value={row.key}
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], key: e.target.value };
              onChange(next);
            }}
            className="h-9 text-sm bg-white"
          />
          <Input
            placeholder="Value"
            value={row.value}
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
            className="h-9 text-sm bg-white"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-red-600"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            disabled={list.length <= 1 && !row.key && !row.value}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function AdminExamPaperEditor() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !examId || examId === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [notificationDate, setNotificationDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [examDate, setExamDate] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [expired, setExpired] = useState(false);
  const [paper, setPaper] = useState<ExamPaperDocument>(() => emptyPaper());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin", "exams", "one", examId],
    queryFn: () => adminExamApi.get(examId!),
    enabled: !isNew && !!examId,
  });

  useEffect(() => {
    if (!isNew) return;
    setTitle("");
    setDescription("");
    setType("");
    setNotificationDate("");
    setLastDate("");
    setExamDate("");
    setEligibility("");
    setApplyUrl("");
    setExpired(false);
    setPaper(emptyPaper());
    setOpenSections({});
  }, [isNew]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description);
    setType(existing.type);
    setNotificationDate(existing.notificationDate ?? "");
    setLastDate(existing.lastDate ?? "");
    setExamDate(existing.examDate ?? "");
    setEligibility(existing.eligibility ?? "");
    setApplyUrl(existing.applyUrl ?? "");
    setExpired(existing.expired);
    if (existing.paper && typeof existing.paper === "object" && "sections" in existing.paper) {
      setPaper(existing.paper as ExamPaperDocument);
    } else {
      setPaper(emptyPaper());
    }
  }, [existing]);

  useEffect(() => {
    if (!paper.sections.length) return;
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const s of paper.sections) {
        if (next[s.id] === undefined) next[s.id] = true;
      }
      return next;
    });
  }, [paper.sections]);

  const createMutation = useMutation({
    mutationFn: (body: AdminExamCreateRequest) => adminExamApi.create(body),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      toast({ title: "Exam created" });
      navigate(`/admin/exams/${row.id}/edit`, { replace: true });
    },
    onError: (e) => {
      toast({
        title: "Create failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof adminExamApi.update>[1]) =>
      adminExamApi.update(examId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "exams", "one", examId] });
      toast({ title: "Saved" });
    },
    onError: (e) => {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const metaValid = useMemo(
    () => title.trim().length > 0 && description.trim().length > 0 && type.trim().length > 0,
    [title, description, type]
  );

  const buildPayload = (cleaned: ExamPaperDocument): AdminExamCreateRequest => ({
    title: title.trim(),
    description: description.trim(),
    type: type.trim(),
    notificationDate: notificationDate || undefined,
    lastDate: lastDate || undefined,
    examDate: examDate || undefined,
    eligibility: eligibility.trim() || undefined,
    applyUrl: applyUrl.trim() || undefined,
    expired,
    paper: cleaned,
  });

  const handleSave = () => {
    if (!metaValid) {
      toast({
        title: "Missing information",
        description: "Title, description, and exam type are required.",
        variant: "destructive",
      });
      return;
    }
    const cleaned = sanitizePaper(paper);
    const paperErr = validateExamPaper(cleaned);
    if (paperErr) {
      toast({
        title: "Paper validation",
        description: paperErr,
        variant: "destructive",
      });
      return;
    }
    const body = buildPayload(cleaned);
    if (isNew) {
      createMutation.mutate(body);
    } else {
      updateMutation.mutate({
        title: body.title,
        description: body.description,
        type: body.type,
        notificationDate: body.notificationDate,
        lastDate: body.lastDate,
        examDate: body.examDate,
        eligibility: body.eligibility,
        applyUrl: body.applyUrl,
        expired: body.expired,
        paper: body.paper,
      });
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= paper.sections.length) return;
    const next = [...paper.sections];
    [next[index], next[j]] = [next[j], next[index]];
    setPaper({ ...paper, sections: next });
  };

  const updateSection = (id: string, patch: Partial<ExamPaperSection>) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const removeSection = (id: string) => {
    setPaper({ ...paper, sections: paper.sections.filter((s) => s.id !== id) });
  };

  const addSection = () => {
    const s = newSection();
    setPaper({ ...paper, sections: [...paper.sections, s] });
    setOpenSections((o) => ({ ...o, [s.id]: true }));
  };

  const moveQuestion = (sectionId: string, qIndex: number, dir: -1 | 1) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const qs = [...s.questions];
        const j = qIndex + dir;
        if (j < 0 || j >= qs.length) return s;
        [qs[qIndex], qs[j]] = [qs[j], qs[qIndex]];
        return { ...s, questions: qs };
      }),
    });
  };

  const updateQuestion = (sectionId: string, qid: string, patch: Partial<ExamPaperQuestion>) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              questions: s.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
            }
      ),
    });
  };

  const addQuestion = (sectionId: string, t: ExamQuestionType) => {
    const q = newQuestion(t);
    setPaper({
      ...paper,
      sections: paper.sections.map((s) =>
        s.id === sectionId ? { ...s, questions: [...s.questions, q] } : s
      ),
    });
  };

  const removeQuestion = (sectionId: string, qid: string) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) =>
        s.id === sectionId ? { ...s, questions: s.questions.filter((q) => q.id !== qid) } : s
      ),
    });
  };

  const setOption = (sectionId: string, qid: string, optIndex: number, patch: Partial<ExamPaperOption>) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) => {
            if (q.id !== qid) return q;
            const opts = [...(q.options ?? [])];
            opts[optIndex] = { ...opts[optIndex], ...patch };
            return { ...q, options: opts };
          }),
        };
      }),
    });
  };

  const addOption = (sectionId: string, qid: string) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) => {
            if (q.id !== qid) return q;
            return {
              ...q,
              options: [...(q.options ?? []), { id: crypto.randomUUID(), label: "", correct: false }],
            };
          }),
        };
      }),
    });
  };

  const removeOption = (sectionId: string, qid: string, optIndex: number) => {
    setPaper({
      ...paper,
      sections: paper.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) => {
            if (q.id !== qid) return q;
            return { ...q, options: (q.options ?? []).filter((_, i) => i !== optIndex) };
          }),
        };
      }),
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading exam…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <Link to="/admin/exams" aria-label="Back to exams">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {isNew ? "Create exam" : "Edit exam"}
              </h1>
              <p className="text-sm text-slate-600">
                Set listing details, then build sections and questions. Structure is saved as flexible JSON.
              </p>
            </div>
          </div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isNew ? "Create" : "Save changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Listing details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. UPSC Civil Services 2026"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="exam-type">Exam type *</Label>
                  <Input
                    id="exam-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    list="admin-exam-type-suggestions"
                    placeholder="e.g. UPSC, Railway, College scholarship…"
                    className="mt-1"
                    autoComplete="off"
                  />
                  <datalist id="admin-exam-type-suggestions">
                    {EXAM_TYPE_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500 mt-1">Use any label; suggestions are optional.</p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <Checkbox checked={expired} onCheckedChange={(v) => setExpired(v === true)} />
                    Mark expired
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Notification</Label>
                  <Input
                    type="date"
                    value={notificationDate}
                    onChange={(e) => setNotificationDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Last date</Label>
                  <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Exam date</Label>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Eligibility</Label>
                <Textarea
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Application URL</Label>
                <Input
                  type="url"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Paper builder
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Add sections, then questions. MCQ and True/False need correct answers marked.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Layers className="h-4 w-4 mr-1" />
                Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {paper.sections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  No sections yet. Click &quot;Section&quot; to add a part of the paper (e.g. General Studies).
                </div>
              ) : (
                paper.sections.map((section, si) => (
                  <Collapsible
                    key={section.id}
                    open={openSections[section.id] ?? true}
                    onOpenChange={(o) => setOpenSections((prev) => ({ ...prev, [section.id]: o }))}
                  >
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-2 py-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                (openSections[section.id] ?? true) === false && "-rotate-90"
                              )}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <GripVertical className="h-4 w-4 text-slate-300 hidden sm:block" />
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          placeholder="Section title"
                          className="h-9 flex-1 font-medium border-transparent bg-transparent px-2 focus-visible:ring-1"
                        />
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveSection(si, -1)}
                            disabled={si === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveSection(si, 1)}
                            disabled={si === paper.sections.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => removeSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="p-4 space-y-4">
                          <div>
                            <Label className="text-xs">Section description (optional)</Label>
                            <Textarea
                              value={section.description ?? ""}
                              onChange={(e) => updateSection(section.id, { description: e.target.value })}
                              rows={2}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <CustomFieldsEditor
                            label="Section metadata"
                            rows={section.customFields ?? []}
                            onChange={(rows) => updateSection(section.id, { customFields: rows })}
                          />
                          <Separator />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-sm font-medium">Questions</Label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="h-9 text-sm">
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Add question
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {EXAM_QUESTION_TYPES.map((qt) => (
                                  <DropdownMenuItem
                                    key={qt.value}
                                    onClick={() => addQuestion(section.id, qt.value)}
                                  >
                                    <span className="font-medium">{qt.label}</span>
                                    <span className="text-xs text-muted-foreground block">{qt.hint}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {section.questions.length === 0 ? (
                            <p className="text-xs text-slate-500">No questions in this section.</p>
                          ) : (
                            <div className="space-y-3">
                              {section.questions.map((q, qi) => (
                                <div
                                  key={q.id}
                                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <Select
                                      value={q.type}
                                      onValueChange={(v) => {
                                        const t = v as ExamQuestionType;
                                        updateQuestion(section.id, q.id, {
                                          type: t,
                                          options: defaultOptionsForType(t),
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="h-9 w-full sm:w-[220px] text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {EXAM_QUESTION_TYPES.map((qt) => (
                                          <SelectItem key={qt.value} value={qt.value}>
                                            {qt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => moveQuestion(section.id, qi, -1)}
                                        disabled={qi === 0}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => moveQuestion(section.id, qi, 1)}
                                        disabled={qi === section.questions.length - 1}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600"
                                        onClick={() => removeQuestion(section.id, q.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Question</Label>
                                    <Textarea
                                      value={q.prompt}
                                      onChange={(e) => updateQuestion(section.id, q.id, { prompt: e.target.value })}
                                      rows={2}
                                      className="mt-1 text-sm"
                                      placeholder="Enter the question text"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <Label className="text-xs">Help text</Label>
                                      <Input
                                        value={q.helpText ?? ""}
                                        onChange={(e) =>
                                          updateQuestion(section.id, q.id, { helpText: e.target.value })
                                        }
                                        className="mt-1 h-9 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Marks</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={q.marks ?? ""}
                                        onChange={(e) =>
                                          updateQuestion(section.id, q.id, {
                                            marks: e.target.value === "" ? undefined : Number(e.target.value),
                                          })
                                        }
                                        className="mt-1 h-9 text-sm"
                                      />
                                    </div>
                                    <div className="flex items-end pb-1">
                                      <label className="flex items-center gap-2 text-xs text-slate-700">
                                        <Checkbox
                                          checked={q.required !== false}
                                          onCheckedChange={(v) =>
                                            updateQuestion(section.id, q.id, { required: v === true })
                                          }
                                        />
                                        Required
                                      </label>
                                    </div>
                                  </div>
                                  {(q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER") && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">Max length (chars)</Label>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={q.maxLength ?? ""}
                                          onChange={(e) =>
                                            updateQuestion(section.id, q.id, {
                                              maxLength: e.target.value === "" ? undefined : Number(e.target.value),
                                            })
                                          }
                                          className="mt-1 h-9 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">Placeholder</Label>
                                        <Input
                                          value={q.placeholder ?? ""}
                                          onChange={(e) =>
                                            updateQuestion(section.id, q.id, { placeholder: e.target.value })
                                          }
                                          className="mt-1 h-9 text-sm"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {(q.type === "MCQ" ||
                                    q.type === "MCQ_MULTI" ||
                                    q.type === "TRUE_FALSE") && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <Label className="text-xs">Options</Label>
                                        {q.type !== "TRUE_FALSE" && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => addOption(section.id, q.id)}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Option
                                          </Button>
                                        )}
                                      </div>
                                      {(q.options ?? []).map((opt, oi) => (
                                        <div key={opt.id || oi} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                          <Input
                                            value={opt.label}
                                            onChange={(e) =>
                                              setOption(section.id, q.id, oi, { label: e.target.value })
                                            }
                                            className="h-9 text-sm flex-1"
                                            placeholder="Option text"
                                          />
                                          <label className="flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
                                            <Checkbox
                                              checked={opt.correct === true}
                                              onCheckedChange={(v) => {
                                                const checked = v === true;
                                                if (q.type === "MCQ" && checked) {
                                                  const opts = (q.options ?? []).map((o, idx) => ({
                                                    ...o,
                                                    correct: idx === oi,
                                                  }));
                                                  updateQuestion(section.id, q.id, { options: opts });
                                                } else {
                                                  setOption(section.id, q.id, oi, { correct: checked });
                                                }
                                              }}
                                            />
                                            Correct
                                          </label>
                                          {q.type !== "TRUE_FALSE" && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-red-600"
                                              onClick={() => removeOption(section.id, q.id, oi)}
                                              disabled={(q.options ?? []).length <= 2}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <CustomFieldsEditor
                                    label="Question metadata"
                                    rows={q.customFields ?? []}
                                    onChange={(rows) => updateQuestion(section.id, q.id, { customFields: rows })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
