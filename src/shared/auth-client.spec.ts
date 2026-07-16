import * as jwt from 'jsonwebtoken';

const SECRET = 'test-portal-secret';
process.env.MARATHON_PORTAL_JWT_SECRET = SECRET;
process.env.AUTH_SERVICE_URL = 'http://auth-test';
process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'internal-test-token';

import { resolvePortalUser, __clearPortalResolutionCacheForTests } from './auth-client';

describe('resolvePortalUser', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    __clearPortalResolutionCacheForTests();
    jest.restoreAllMocks();
  });

  function portalToken(sub: string): string {
    return jwt.sign({ sub }, SECRET, { algorithm: 'HS256', expiresIn: 300 });
  }

  it('resolves numeric portal sub to auth UUID via internal endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authUserId: 'e9c0e180-c837-404e-a954-a37b56241a80', normalizedEmail: 'x@y.z' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await resolvePortalUser(portalToken('310740'));
    expect(user).toEqual({ id: 'e9c0e180-c837-404e-a954-a37b56241a80' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://auth-test/internal/users/by-legacy-id?system=speakasap-portal&legacyUserId=310740');
    expect((init.headers as Record<string, string>)['x-internal-service-token']).toBe('internal-test-token');
  });

  it('caches resolution per sub (single fetch for two calls)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authUserId: 'e9c0e180-c837-404e-a954-a37b56241a80' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await resolvePortalUser(portalToken('310740'));
    await resolvePortalUser(portalToken('310740'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to raw sub when lookup 404s', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    expect(await resolvePortalUser(portalToken('310740'))).toEqual({ id: '310740' });
  });

  it('falls back to raw sub when lookup throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    expect(await resolvePortalUser(portalToken('310740'))).toEqual({ id: '310740' });
  });

  it('does not call auth for UUID subs', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await resolvePortalUser(portalToken('e9c0e180-c837-404e-a954-a37b56241a80'));
    expect(user).toEqual({ id: 'e9c0e180-c837-404e-a954-a37b56241a80' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for invalid token', async () => {
    expect(await resolvePortalUser('garbage')).toBeNull();
  });
});
