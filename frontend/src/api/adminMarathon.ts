import { authFetch } from '../auth';

export class AdminMarathonPricingError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminMarathonPricingError';
    this.status = status;
  }
}

export type AdminMarathonPriceItem = {
  id: string;
  languageCode: string;
  slug: string;
  title: string;
  productId: string;
  productTitle: string;
  price: string;
  currency: string;
  totalHours: number;
};

export type AdminMarathonPricesResponse = {
  activeCount: number;
  productCount: number;
  items: AdminMarathonPriceItem[];
};

export type AdminSession = {
  admin: boolean;
  userId: string;
  email?: string;
};

export type UpdateAllMarathonPricesInput = {
  price: string;
  currency: string;
  expectedActiveCount: number;
};

async function readError(response: Response): Promise<string> {
  const fallback = `admin-pricing:${response.status}`;
  try {
    const body = await response.json() as { message?: unknown; error?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Keep the fallback status message when the server did not return JSON.
  }
  return fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new AdminMarathonPricingError(response.status, await readError(response));
  }
  return response.json() as Promise<T>;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const response = await authFetch('/api/v1/admin/me');
  return parseResponse<AdminSession>(response);
}

export async function fetchAdminMarathonPrices(): Promise<AdminMarathonPricesResponse> {
  const response = await authFetch('/api/v1/admin/marathons/prices');
  return parseResponse<AdminMarathonPricesResponse>(response);
}

export async function updateAllAdminMarathonPrices(
  input: UpdateAllMarathonPricesInput,
): Promise<AdminMarathonPricesResponse> {
  const response = await authFetch('/api/v1/admin/marathons/prices', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return parseResponse<AdminMarathonPricesResponse>(response);
}
