export interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  landingVideoUrl?: string;
}

export interface MarathonLanguage {
  code: string;
  name: string;
  url?: string;
}

export interface CatalogReadiness {
  ready?: boolean;
  registrationOpen: boolean;
  paymentReady?: boolean;
  giftReady?: boolean;
  assignmentReady?: boolean;
  counts: {
    activeMarathons: number;
    steps: number;
    stepsWithContent: number;
    products: number;
    unusedGifts: number;
  };
  missing: string[];
}

export interface PublicReview {
  name: string;
  photo?: string;
  text: string;
}

export interface WinnerSummary {
  id: string;
  name?: string;
  gold?: number;
  silver?: number;
  bronze?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}:${response.status}`);
  }
  return response.json() as Promise<T>;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export async function fetchMarathonByLanguage(languageCode: string): Promise<MarathonSummary | null> {
  const response = await fetch(`/api/v1/marathons/by-language/${encodeURIComponent(languageCode)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`marathon:${response.status}`);
  }

  const body = await response.text();
  return body.trim() ? JSON.parse(body) as MarathonSummary : null;
}

export async function fetchMarathonLanguages(): Promise<MarathonLanguage[]> {
  try {
    return asArray<MarathonLanguage>(await fetchJson<unknown>('/api/v1/marathons/languages'));
  } catch {
    return [];
  }
}

export function fetchCatalogReadiness(): Promise<CatalogReadiness> {
  return fetchJson<CatalogReadiness>('/api/v1/marathons/readiness');
}

export async function fetchPublicReviews(): Promise<PublicReview[]> {
  try {
    return asArray<PublicReview>(await fetchJson<unknown>('/api/v1/reviews'));
  } catch {
    return [];
  }
}

export async function fetchWinnerSummaries(limit = 6): Promise<WinnerSummary[]> {
  try {
    const page = await fetchJson<{ items?: WinnerSummary[] }>(`/api/v1/winners?page=1&limit=${limit}`);
    return asArray<WinnerSummary>(page.items);
  } catch {
    return [];
  }
}
