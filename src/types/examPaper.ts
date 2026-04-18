/** Question types supported by admin exam paper builder and backend validator. */
export type ExamQuestionType =
  | "MCQ"
  | "MCQ_MULTI"
  | "TRUE_FALSE"
  | "DESCRIPTIVE"
  | "SHORT_ANSWER"
  | "NUMERIC";

export interface ExamPaperCustomField {
  key: string;
  value: string;
}

export interface ExamPaperOption {
  id: string;
  label: string;
  /** For MCQ / TRUE_FALSE / MCQ_MULTI */
  correct?: boolean;
}

export interface ExamPaperQuestion {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  helpText?: string;
  required?: boolean;
  marks?: number;
  maxLength?: number;
  placeholder?: string;
  options?: ExamPaperOption[];
  customFields?: ExamPaperCustomField[];
}

export interface ExamPaperSection {
  id: string;
  title: string;
  description?: string;
  questions: ExamPaperQuestion[];
  customFields?: ExamPaperCustomField[];
}

export interface ExamPaperDocument {
  version: number;
  sections: ExamPaperSection[];
}

export const EXAM_QUESTION_TYPES: { value: ExamQuestionType; label: string; hint: string }[] = [
  { value: "MCQ", label: "MCQ (single correct)", hint: "One correct answer" },
  { value: "MCQ_MULTI", label: "MCQ (multi correct)", hint: "One or more correct" },
  { value: "TRUE_FALSE", label: "True / False", hint: "Two statements" },
  { value: "DESCRIPTIVE", label: "Descriptive", hint: "Long written answer" },
  { value: "SHORT_ANSWER", label: "Short answer", hint: "Brief text" },
  { value: "NUMERIC", label: "Numeric", hint: "Number input" },
];

export function emptyPaper(): ExamPaperDocument {
  return { version: 1, sections: [] };
}

export function newSection(): ExamPaperSection {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    questions: [],
    customFields: [],
  };
}

export function defaultOptionsForType(type: ExamQuestionType): ExamPaperOption[] {
  if (type === "TRUE_FALSE") {
    return [
      { id: crypto.randomUUID(), label: "True", correct: true },
      { id: crypto.randomUUID(), label: "False", correct: false },
    ];
  }
  if (type === "MCQ" || type === "MCQ_MULTI") {
    return [
      { id: crypto.randomUUID(), label: "Option A", correct: type === "MCQ" },
      { id: crypto.randomUUID(), label: "Option B", correct: type === "MCQ_MULTI" },
      { id: crypto.randomUUID(), label: "Option C", correct: false },
      { id: crypto.randomUUID(), label: "Option D", correct: false },
    ];
  }
  return [];
}

export function newQuestion(type: ExamQuestionType = "MCQ"): ExamPaperQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    prompt: "",
    required: true,
    marks: undefined,
    options: defaultOptionsForType(type),
    customFields: [],
  };
}
