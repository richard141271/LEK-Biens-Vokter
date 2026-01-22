export type SurveyType = "BEEKEEPER" | "NON_BEEKEEPER";

export interface Survey {
  id: string;
  version: string;
  type: SurveyType;
  title: string;
  estimated_minutes: number;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "SCALE_1_5"
  | "TEXT"
  | "DROPDOWN"
  | "EMAIL";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: Option[];
  visible_if?: Condition[];
}

export interface Option {
  value: string;   // lagres i DB
  label: string;   // vises i UI
}

export interface Condition {
  question_id: string;
  equals: string;
}
