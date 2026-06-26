import { authFetch } from '../auth';

export class MarathonAuthRequiredError extends Error {
  constructor() {
    super('Marathon authentication is required.');
    this.name = 'MarathonAuthRequiredError';
  }
}

export type AssignmentBranch = 'beginner' | 'medium' | 'advanced' | 'beginner-medium';

export interface AssignmentChoice {
  value: string;
  label: string;
}

export type AssignmentBlock =
  | { id: string; type: 'text'; text: string; style?: 'paragraph' | 'heading' | 'lead'; branch?: AssignmentBranch }
  | { id: string; type: 'quote'; text: string; branch?: AssignmentBranch }
  | { id: string; type: 'list'; title?: string; items: string[]; branch?: AssignmentBranch }
  | { id: string; type: 'knownWords'; name: string; paragraphs: string[]; label?: string; sourceForm?: string; sourceName?: string; branch?: AssignmentBranch }
  | { id: string; type: 'link'; href: string; text: string; branch?: AssignmentBranch }
  | { id: string; type: 'video'; code: string; title?: string; branch?: AssignmentBranch }
  | { id: string; type: 'audio'; code: string; title?: string; branch?: AssignmentBranch }
  | {
      id: string;
      type: 'field';
      name: string;
      label: string;
      fieldType: 'text' | 'textarea' | 'radio' | 'checkbox';
      required: boolean;
      choices?: AssignmentChoice[];
      branch?: AssignmentBranch;
    };

export type SubmissionPayload = Record<string, unknown>;

export interface StepInfo {
  id: string;
  title: string;
  sequence: number;
  assignmentContent: string | null;
  assignmentBlocks?: AssignmentBlock[] | null;
  formKey: string | null;
  socialLink: string | null;
}

export interface RandomAnswer {
  marathoner: { name: string };
  report: string;
  payload?: SubmissionPayload | null;
  complete_time: string;
}

export interface SavedSubmission {
  exists: boolean;
  id?: string;
  report: string;
  payload: SubmissionPayload;
  state: 'completed' | 'active';
  is_late: boolean;
  bonus_left: number;
  updated_at?: string;
}

export interface SubmittedStepReport {
  id?: string;
  state?: 'completed' | 'active';
  is_late?: boolean;
  bonus_left?: number;
  updated_at?: string;
  message?: string;
  error?: string;
}

export async function fetchStepInfo(stepId: string): Promise<StepInfo | null> {
  const response = await fetch(`/api/v1/steps/${encodeURIComponent(stepId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`step:${response.status}`);
  }
  return response.json() as Promise<StepInfo>;
}

export async function fetchSavedSubmission(participantId: string, stepId: string): Promise<SavedSubmission> {
  const response = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(participantId)}/submissions/${encodeURIComponent(stepId)}`);
  if (response.status === 401) {
    throw new MarathonAuthRequiredError();
  }
  if (!response.ok) {
    throw new Error(`saved-submission:${response.status}`);
  }
  return response.json() as Promise<SavedSubmission>;
}

export async function fetchRandomAnswer(stepId: string, excludeMarathonerId?: string): Promise<RandomAnswer | null> {
  const params = new URLSearchParams({ stepId });
  if (excludeMarathonerId) params.set('excludeMarathonerId', excludeMarathonerId);

  const response = await fetch(`/api/v1/answers/random?${params}`);
  return response.ok ? response.json() as Promise<RandomAnswer | null> : null;
}

async function sendStepReport(
  participantId: string,
  stepId: string,
  report: string,
  payload: SubmissionPayload,
  completed: boolean,
): Promise<SubmittedStepReport> {
  const response = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(participantId)}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stepId,
      report,
      payload,
      completed,
    }),
  });

  if (response.status === 401) {
    throw new MarathonAuthRequiredError();
  }

  const body = await response.json().catch(() => ({} as SubmittedStepReport));
  if (!response.ok) {
    throw new Error(body.message || body.error || `Submission failed (${response.status})`);
  }
  return body;
}

export async function saveStepDraft(
  participantId: string,
  stepId: string,
  report: string,
  payload: SubmissionPayload = {},
): Promise<SubmittedStepReport> {
  return sendStepReport(participantId, stepId, report, payload, false);
}

export async function submitStepReport(
  participantId: string,
  stepId: string,
  report: string,
  payload: SubmissionPayload = {},
): Promise<SubmittedStepReport> {
  return sendStepReport(participantId, stepId, report, payload, true);
}
