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

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
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
    const hashParams = new URLSearchParams(url.hash.slice(1));
    token = token || hashParams.get(CENTRAL_ACCESS_TOKEN_PARAM) || hashParams.get(LEGACY_URL_PARAM);
    let changed = false;
    for (const key of AUTH_HANDOFF_HASH_PARAMS) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
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

function appendAuthReturnParams(base: string, currentPath: string): string {
  const returnUrl = window.location.origin + currentPath;
  const url = new URL(base, window.location.origin);
  const usesLegacyPortal = url.hostname.includes('speakasap.com');
  url.searchParams.set(usesLegacyPortal ? 'next' : 'return_url', returnUrl);
  if (!usesLegacyPortal) {
    url.searchParams.set('client_id', (import.meta.env.VITE_AUTH_CLIENT_ID as string) || 'marathon');
  }
  return url.toString();
}

export function getLoginUrl(currentPath: string = getCurrentReturnPath()): string {
  const base =
    (import.meta.env.VITE_AUTH_LOGIN_URL as string) ||
    (import.meta.env.VITE_PORTAL_LOGIN_URL as string) ||
    DEFAULT_AUTH_LOGIN_URL;
  return appendAuthReturnParams(base, currentPath);
}

export function getRegistrationUrl(currentPath: string = getCurrentReturnPath()): string {
  const base = (import.meta.env.VITE_AUTH_REGISTER_URL as string) || DEFAULT_AUTH_REGISTER_URL;
  return appendAuthReturnParams(base, currentPath);
}

export function redirectToLogin(currentPath: string = getCurrentReturnPath()): void {
  window.location.href = getLoginUrl(currentPath);
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
