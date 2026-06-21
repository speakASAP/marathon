export interface MarathonSummary {
  id: string;
  languageCode: string;
  title: string;
  slug?: string;
  active?: boolean;
  coverImageUrl?: string;
  landingVideoUrl?: string;
  participantCount?: number;
}

export interface MarathonLanguage {
  code: string;
  name: string;
  full_name?: string;
  url?: string;
}

export interface CatalogReadiness {
  ready?: boolean;
  registrationOpen: boolean;
  paymentReady?: boolean;
  assignmentReady?: boolean;
  counts: {
    activeMarathons: number;
    activeLanguages?: number;
    registeredParticipants?: number;
    activeParticipants?: number;
    finishedParticipants?: number;
    steps: number;
    stepsWithContent: number;
    products: number;
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
  avatar?: string;
}

export interface WinnerPage {
  items: WinnerSummary[];
  nextPage: number | null;
  total?: number;
}

export interface MarathonWinnerReview {
  marathon: string;
  state: string;
  completed: string;
  review: string;
  thanks: string;
}

export interface WinnerDetail {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  avatar: string;
  reviews: MarathonWinnerReview[];
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

export function getMarathonRegisterPath(language: MarathonLanguage): string {
  const href = language.url || `/${language.code}`;
  try {
    const parsed = new URL(href, window.location.origin);
    return `${parsed.pathname.replace(/\/$/, "") || "/"}#register`;
  } catch {
    return `/${encodeURIComponent(language.code)}#register`;
  }
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

export async function fetchActiveMarathons(): Promise<MarathonSummary[]> {
  try {
    return asArray<MarathonSummary>(await fetchJson<unknown>('/api/v1/marathons?active=true'));
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
    const page = await fetchWinnerPage(1, limit);
    return asArray<WinnerSummary>(page.items);
  } catch {
    return [];
  }
}

export async function fetchWinnerPage(page = 1, limit = 24): Promise<WinnerPage> {
  const body = await fetchJson<Partial<WinnerPage>>(`/api/v1/winners?page=${page}&limit=${limit}`);
  return {
    items: asArray<WinnerSummary>(body.items),
    nextPage: typeof body.nextPage === 'number' ? body.nextPage : null,
    total: typeof body.total === 'number' ? body.total : undefined,
  };
}

export async function fetchWinnerDetail(winnerId: string): Promise<WinnerDetail | null> {
  const response = await fetch(`/api/v1/winners/${encodeURIComponent(winnerId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`winner:${response.status}`);
  }
  return response.json() as Promise<WinnerDetail>;
}
