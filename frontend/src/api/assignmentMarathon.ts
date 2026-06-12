import { authFetch } from '../auth';

export class MarathonAuthRequiredError extends Error {
  constructor() {
    super('Marathon authentication is required.');
    this.name = 'MarathonAuthRequiredError';
  }
}

export interface StepInfo {
  id: string;
  title: string;
  sequence: number;
  assignmentContent: string | null;
  formKey: string | null;
  socialLink: string | null;
}

export interface RandomAnswer {
  marathoner: { name: string };
  report: string;
  complete_time: string;
}

export interface SavedSubmission {
  exists: boolean;
  id?: string;
  report: string;
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

export async function submitStepReport(participantId: string, stepId: string, report: string): Promise<SubmittedStepReport> {
  const response = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(participantId)}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stepId,
      report,
      completed: true,
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
