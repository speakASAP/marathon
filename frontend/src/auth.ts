/**
 * Auth for marathon: token in localStorage; read from URL on return from Auth.
 * Central Auth returns access_token in the URL fragment; the legacy portal may still
 * return marathon_token in the query or hash during the transition.
 */

const STORAGE_KEY = 'marathon_token';
const LEGACY_URL_PARAM = 'marathon_token';
const CENTRAL_ACCESS_TOKEN_PARAM = 'access_token';
const AUTH_HANDOFF_HASH_PARAMS = new Set([
  CENTRAL_ACCESS_TOKEN_PARAM,
  'refresh_token',
  'expires_at',
  'auth_method',
  'state',
  'marathon_token',
]);
const DEFAULT_AUTH_LOGIN_URL = 'https://auth.alfares.cz/login';
const DEFAULT_AUTH_REGISTER_URL = 'https://auth.alfares.cz/register';
const DEFAULT_PORTAL_PASSWORD_RESET_URL = 'https://speakasap.com/password_reset/';
const PENDING_REGISTRATION_KEY = 'marathon_pending_registration';
const PENDING_REGISTRATION_TTL_MS = 60 * 60 * 1000;

export type PendingMarathonRegistration = {
  email: string;
  phone: string;
  name?: string;
  languageCode: string;
  returnPath: string;
  createdAt: number;
};

export type AuthPrefill = {
  email?: string;
  phone?: string;
  identifier?: string;
};

function isPendingRegistration(value: unknown): value is PendingMarathonRegistration {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PendingMarathonRegistration>;
  return (
    typeof candidate.email === 'string' &&
    typeof candidate.phone === 'string' &&
    typeof candidate.languageCode === 'string' &&
    typeof candidate.returnPath === 'string' &&
    typeof candidate.createdAt === 'number'
  );
}

function readSessionStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session storage can be unavailable in privacy-restricted browser contexts.
  }
}

function removeSessionStorage(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Session storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function savePendingRegistration(input: Omit<PendingMarathonRegistration, 'createdAt'>): void {
  writeSessionStorage(PENDING_REGISTRATION_KEY, JSON.stringify({ ...input, createdAt: Date.now() }));
}

export function getPendingRegistration(languageCode?: string): PendingMarathonRegistration | null {
  const raw = readSessionStorage(PENDING_REGISTRATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPendingRegistration(parsed)) {
      clearPendingRegistration();
      return null;
    }
    if (Date.now() - parsed.createdAt > PENDING_REGISTRATION_TTL_MS) {
      clearPendingRegistration();
      return null;
    }
    if (languageCode && parsed.languageCode !== languageCode) {
      return null;
    }
    return parsed;
  } catch {
    clearPendingRegistration();
    return null;
  }
}

export function clearPendingRegistration(): void {
  removeSessionStorage(PENDING_REGISTRATION_KEY);
}

/**
 * Read token from URL (query or hash) and store it. Removes param/hash from URL.
 * Call once on app load (e.g. in App or Profile). Returns token if found.
 */
export function captureTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  let token: string | null = null;
  const legacyParam = url.searchParams.get(LEGACY_URL_PARAM);
  if (legacyParam) {
    token = legacyParam;
    url.searchParams.delete(LEGACY_URL_PARAM);
  }

  if (url.hash.includes('=')) {
    const rawHash = url.hash.slice(1);
    const hashParts = rawHash.split('&');
    const plainAnchor = hashParts[0] && !hashParts[0].includes('=') ? hashParts[0] : '';
    const hashQuery = plainAnchor ? hashParts.slice(1).join('&') : rawHash;
    const hashParams = new URLSearchParams(hashQuery);
    token = token || hashParams.get(CENTRAL_ACCESS_TOKEN_PARAM) || hashParams.get(LEGACY_URL_PARAM);
    let changed = false;
    for (const key of AUTH_HANDOFF_HASH_PARAMS) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const nextHashQuery = hashParams.toString();
      const nextHashParts = [plainAnchor, nextHashQuery].filter(Boolean);
      url.hash = nextHashParts.length ? `#${nextHashParts.join('&')}` : '';
    }
  }

  if (token) {
    setToken(token);
  }
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  return token;
}

function getCurrentReturnPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function resolveMarathonAuthLang(): string {
  const pathMatch = window.location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  const fromPath = pathMatch?.[1]?.toLowerCase() || '';
  if (fromPath === 'en' || fromPath === 'cs' || fromPath === 'ru') {
    return fromPath;
  }
  if (fromPath === 'cz') {
    return 'cs';
  }
  return 'ru';
}

function appendAuthReturnParams(base: string, currentPath: string, prefill?: AuthPrefill): string {
  const returnUrl = window.location.origin + currentPath;
  const url = new URL(base, window.location.origin);
  const usesLegacyPortal = url.hostname.includes('speakasap.com');
  url.searchParams.set(usesLegacyPortal ? 'next' : 'return_url', returnUrl);
  if (!usesLegacyPortal) {
    url.searchParams.set('client_id', (import.meta.env.VITE_AUTH_CLIENT_ID as string) || 'marathon');
    url.searchParams.set('lang', resolveMarathonAuthLang());
    const identifier = prefill?.identifier || prefill?.email || prefill?.phone || '';
    if (identifier) {
      url.searchParams.set('login_hint', identifier);
      url.searchParams.set('identifier', identifier);
    }
    if (prefill?.email) {
      url.searchParams.set('email', prefill.email);
    }
    if (prefill?.phone) {
      url.searchParams.set('phone', prefill.phone);
    }
  }
  return url.toString();
}

export function getLoginUrl(currentPath: string = getCurrentReturnPath(), prefill?: AuthPrefill): string {
  const base =
    (import.meta.env.VITE_AUTH_LOGIN_URL as string) ||
    (import.meta.env.VITE_PORTAL_LOGIN_URL as string) ||
    DEFAULT_AUTH_LOGIN_URL;
  return appendAuthReturnParams(base, currentPath, prefill);
}

export function getRegistrationUrl(currentPath: string = getCurrentReturnPath(), prefill?: AuthPrefill): string {
  const base = (import.meta.env.VITE_AUTH_REGISTER_URL as string) || DEFAULT_AUTH_REGISTER_URL;
  return appendAuthReturnParams(base, currentPath, prefill);
}

export function redirectToLogin(currentPath: string = getCurrentReturnPath(), prefill?: AuthPrefill): void {
  window.location.href = getLoginUrl(currentPath, prefill);
}

export function getPasswordResetUrl(): string {
  return (
    (import.meta.env.VITE_AUTH_PASSWORD_RESET_URL as string) ||
    (import.meta.env.VITE_PORTAL_PASSWORD_RESET_URL as string) ||
    DEFAULT_PORTAL_PASSWORD_RESET_URL
  );
}

/**
 * Fetch with Bearer token if available. For /api/v1/me/*.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
