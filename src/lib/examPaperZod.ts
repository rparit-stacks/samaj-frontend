import { z } from "zod";
import type { ExamPaperDocument, ExamQuestionType } from "@/types/examPaper";

const customFieldSchema = z.object({
  key: z.string().min(1, "Key required"),
  value: z.string().min(1, "Value required"),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Option text required"),
  correct: z.boolean().optional(),
});

const questionTypes = z.enum([
  "MCQ",
  "MCQ_MULTI",
  "TRUE_FALSE",
  "DESCRIPTIVE",
  "SHORT_ANSWER",
  "NUMERIC",
]);

export const examPaperQuestionSchema = z
  .object({
    id: z.string().min(1),
    type: questionTypes,
    prompt: z.string().min(1, "Question text required"),
    helpText: z.string().optional(),
    required: z.boolean().optional(),
    marks: z.number().nonnegative().optional(),
    maxLength: z.number().positive().optional(),
    placeholder: z.string().optional(),
    options: z.array(optionSchema).optional(),
    customFields: z.array(customFieldSchema).optional(),
  })
  .superRefine((q, ctx) => {
    const t = q.type as ExamQuestionType;
    const opts = q.options ?? [];

    if (t === "MCQ" || t === "MCQ_MULTI") {
      if (opts.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Need at least 2 options", path: ["options"] });
        return;
      }
      for (const o of opts) {
        if (!o.id?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each option needs an id", path: ["options"] });
        }
      }
      const correct = opts.filter((o) => o.correct === true).length;
      if (t === "MCQ" && correct !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ must have exactly one correct option",
          path: ["options"],
        });
      }
      if (t === "MCQ_MULTI" && correct < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick at least one correct option",
          path: ["options"],
        });
      }
    } else if (t === "TRUE_FALSE") {
      if (opts.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "True/False needs exactly 2 options",
          path: ["options"],
        });
        return;
      }
      const correct = opts.filter((o) => o.correct === true).length;
      if (correct !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mark exactly one option as correct",
          path: ["options"],
        });
      }
    } else if (opts.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This question type should not have options",
        path: ["options"],
      });
    }
  });

export const examPaperSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Section title required"),
  description: z.string().optional(),
  questions: z.array(examPaperQuestionSchema),
  customFields: z.array(customFieldSchema).optional(),
});

export const examPaperDocumentSchema = z.object({
  version: z.number().int().min(1),
  sections: z.array(examPaperSectionSchema),
});

export function validateExamPaper(doc: ExamPaperDocument): string | null {
  const r = examPaperDocumentSchema.safeParse(doc);
  if (r.success) return null;
  return r.error.issues.map((e) => e.message).join("; ");
}
