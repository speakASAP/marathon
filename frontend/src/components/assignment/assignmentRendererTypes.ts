import type { AssignmentBlock, SubmissionPayload } from "../../api/assignmentMarathon";

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;
export type Level = "beginner" | "medium" | "advanced" | null;

export type FieldBlock = Extract<AssignmentBlock, { type: "field" }>;
export type TextBlock = Extract<AssignmentBlock, { type: "text" }>;
export type KnownWordsBlockModel = Extract<AssignmentBlock, { type: "knownWords" }>;

export type PayloadChange = (payload: SubmissionPayload, report: string) => void;
