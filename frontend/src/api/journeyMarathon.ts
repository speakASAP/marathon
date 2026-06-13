import { authFetch, getToken } from '../auth';

export class MarathonRegistrationAuthExpiredError extends Error {
  constructor() {
    super('Registration session expired.');
    this.name = 'MarathonRegistrationAuthExpiredError';
  }
}

export class MarathonAuthRequiredError extends Error {
  constructor() {
    super('Marathon authentication is required.');
    this.name = 'MarathonAuthRequiredError';
  }
}

export interface RegistrationInput {
  email: string;
  name?: string;
  phone?: string;
  languageCode: string;
}

export interface RegistrationResult {
  marathonerId: string;
  redirectUrl?: string;
  userBound: boolean;
  tokenUsed: boolean;
}

export interface GiftRedemptionResult {
  status: string;
  marathonerId: string;
  redirectUrl?: string;
}

interface ApiErrorBody {
  message?: string;
  detail?: string;
  error?: string;
}

function readApiError(response: Response, body: ApiErrorBody): Error {
  return new Error(body.message || body.detail || body.error || `Request failed (${response.status})`);
}

export function normalizeRegistrationRedirectUrl(redirectUrl?: string): string {
  return redirectUrl
    ? String(redirectUrl).replace(/^(https?:\/\/[^/]+)?\/marathon\/([a-z]{2})\/?$/i, '$1/$2/')
    : '';
}

export async function submitMarathonRegistration(input: RegistrationInput): Promise<RegistrationResult> {
  const token = getToken();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch('/api/v1/registrations', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({} as ApiErrorBody & Partial<RegistrationResult>));

  if (response.status === 401 && token) {
    throw new MarathonRegistrationAuthExpiredError();
  }
  if (!response.ok) {
    throw readApiError(response, body);
  }

  return {
    marathonerId: typeof body.marathonerId === 'string' ? body.marathonerId : '',
    redirectUrl: typeof body.redirectUrl === 'string' ? body.redirectUrl : undefined,
    userBound: body.userBound === true,
    tokenUsed: Boolean(token),
  };
}

export async function redeemGiftCode(marathonerId: string, code: string): Promise<GiftRedemptionResult> {
  const response = await authFetch('/api/v1/vip/gift-redemptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marathonerId, code }),
  });

  if (response.status === 401) {
    throw new MarathonAuthRequiredError();
  }

  const body = await response.json().catch(() => ({} as ApiErrorBody & Partial<GiftRedemptionResult>));
  if (!response.ok) {
    throw readApiError(response, body);
  }

  return {
    status: typeof body.status === 'string' ? body.status : 'vip_unlocked',
    marathonerId: typeof body.marathonerId === 'string' ? body.marathonerId : marathonerId,
    redirectUrl: typeof body.redirectUrl === 'string' ? body.redirectUrl : undefined,
  };
}
