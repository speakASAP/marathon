import { authFetch } from '../auth';

export class MarathonAuthRequiredError extends Error {
  constructor() {
    super('Marathon authentication is required.');
    this.name = 'MarathonAuthRequiredError';
  }
}

export class MarathonNotFoundError extends Error {
  constructor() {
    super('Marathon profile was not found.');
    this.name = 'MarathonNotFoundError';
  }
}

export interface Answer {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
  block_reason?: string | null;
}

export interface MyMarathonSummary {
  id: string;
  title: string;
  languageCode: string;
  type: string;
  needs_payment: boolean;
  registered: boolean;
  bonus_left: number;
  bonus_total: number;
  current_step: Answer | null;
  answers: Answer[];
}

export interface MyMarathon {
  id: string;
  title: string;
  languageCode: string;
  type: string;
  needs_payment: boolean;
  bonus_left: number;
  bonus_total: number;
  can_change_report_time: boolean;
  report_time: string | null;
  current_step: Answer | null;
  answers: Answer[];
  finished_at: string | null;
  nps_survey: NpsSurvey | null;
}

export interface NpsSurvey {
  score: number;
  comment: string | null;
  submitted_at: string;
}

export interface ProgressReport {
  generatedAt: string;
  participant: {
    id: string;
    name: string | null;
    email: string | null;
    active: boolean;
    registeredAt: string;
    finishedAt: string | null;
  };
  marathon: {
    id: string;
    title: string;
    languageCode: string;
    slug: string;
  };
  access: {
    type: string;
    needsPayment: boolean;
    vipRequired: boolean;
    paymentReported: boolean;
    bonusDaysLeft: number;
    bonusDaysTotal: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    checkedSteps: number;
    activeSteps: number;
    lockedSteps: number;
    lateSteps: number;
    trialSteps: number;
    gatedSteps: number;
    completionPercent: number;
    penaltyReports: number;
    paymentAttempts: number;
  };
  currentStep: {
    title: string;
    state: string;
    isLate: boolean;
    blockReason?: string | null;
  } | null;
  steps: Array<{
    stepId: string;
    sequence: number;
    title: string;
    state: string;
    isTrialStep: boolean;
    isLate: boolean;
    submittedAt: string | null;
    blockReason?: string | null;
  }>;
  paymentAttempts: Array<{
    orderId: string;
    status: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    createdAt: string;
    confirmedAt: string | null;
  }>;
}

interface CheckoutPayload {
  redirectUrl?: unknown;
  payment?: { data?: { redirectUrl?: unknown }; redirectUrl?: unknown };
  message?: string;
  error?: string;
}

function readCheckoutRedirectUrl(payload: CheckoutPayload): string {
  const rawUrl = payload.redirectUrl ?? payload.payment?.data?.redirectUrl ?? payload.payment?.redirectUrl;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.href;
  } catch {
    return '';
  }
}

async function readJsonBody<T extends { message?: string; error?: string }>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

export async function fetchMyMarathon(marathonerId: string): Promise<MyMarathon> {
  const response = await authFetch(`/api/v1/me/marathons/${marathonerId}`);
  if (response.status === 401) throw new MarathonAuthRequiredError();
  if (response.status === 404) throw new MarathonNotFoundError();
  if (!response.ok) throw new Error(`profile:${response.status}`);
  return response.json() as Promise<MyMarathon>;
}

export async function fetchMyMarathons(): Promise<MyMarathonSummary[]> {
  const response = await authFetch('/api/v1/me/marathons');
  if (response.status === 401) throw new MarathonAuthRequiredError();
  if (!response.ok) throw new Error(`profile-list:${response.status}`);

  const body = await response.json().catch(() => []);
  return Array.isArray(body) ? body as MyMarathonSummary[] : [];
}

export type VipPaymentMethod = 'paypal' | 'card' | 'fiobanka';

export async function createVipCheckout(marathonerId: string, paymentMethod: VipPaymentMethod): Promise<string> {
  const response = await authFetch('/api/v1/vip/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marathonerId, paymentMethod }),
  });

  if (response.status === 401) throw new MarathonAuthRequiredError();

  const body = await readJsonBody<CheckoutPayload>(response);
  if (!response.ok) {
    throw new Error(body.message || body.error || `Checkout failed (${response.status})`);
  }
  return readCheckoutRedirectUrl(body);
}

export async function fetchProgressReport(marathonerId: string): Promise<ProgressReport> {
  const response = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/progress-report`);
  if (response.status === 401) throw new MarathonAuthRequiredError();

  const body = await readJsonBody<{ message?: string; error?: string }>(response);
  if (!response.ok) {
    throw new Error(body.message || body.error || `Progress report failed (${response.status})`);
  }
  return body as ProgressReport;
}

export async function saveNpsSurvey(marathonerId: string, score: number, comment: string): Promise<NpsSurvey> {
  const response = await authFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/nps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });

  if (response.status === 401) throw new MarathonAuthRequiredError();

  const body = await readJsonBody<NpsSurvey & { message?: string; error?: string }>(response);
  if (!response.ok) {
    throw new Error(body.message || body.error || `Feedback failed (${response.status})`);
  }
  return body;
}
