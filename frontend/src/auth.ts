/**
 * Auth for marathon: token in localStorage; read from URL on return from portal login.
 * Portal login URL should redirect back with token in query or hash (e.g. ?marathon_token=JWT).
 */

const STORAGE_KEY = 'marathon_token';
const URL_PARAM = 'marathon_token';
const URL_HASH_PREFIX = 'marathon_token=';

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
  const param = url.searchParams.get(URL_PARAM);
  if (param) {
    token = param;
    url.searchParams.delete(URL_PARAM);
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  if (!token && url.hash) {
    const match = url.hash.match(new RegExp(URL_HASH_PREFIX + '([^&]+)'));
    if (match) {
      token = decodeURIComponent(match[1]);
      const newHash = url.hash.replace(new RegExp(URL_HASH_PREFIX + '[^&]*(&|$)'), '$1').replace(/^#&|#$/, '') || '';
      window.history.replaceState({}, '', url.pathname + url.search + (newHash ? '#' + newHash : ''));
    }
  }
  if (token) {
    setToken(token);
  }
  return token;
}

/**
 * Redirect to portal login with return URL so portal can send user back with token.
 * Uses VITE_PORTAL_LOGIN_URL (e.g. https://speakasap.com/login/) and next= marathon origin + path.
 */
export function redirectToLogin(currentPath: string = window.location.pathname): void {
  const base = (import.meta.env.VITE_PORTAL_LOGIN_URL as string) || 'https://speakasap.com/login/';
  const returnUrl = window.location.origin + currentPath;
  const sep = base.includes('?') ? '&' : '?';
  window.location.href = `${base}${sep}next=${encodeURIComponent(returnUrl)}`;
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
