import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { MARATHON_ADMIN_SERVICE_ROLES, ServiceAuthGuard } from './service-auth.guard';

function ctx(headers: Record<string, string>) {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as never;
}

describe('ServiceAuthGuard', () => {
  const originalFetch = global.fetch;
  const originalAuthUrl = process.env.AUTH_SERVICE_URL;

  beforeEach(() => {
    process.env.AUTH_SERVICE_URL = 'http://auth-microservice:3370';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalAuthUrl === undefined) {
      delete process.env.AUTH_SERVICE_URL;
    } else {
      process.env.AUTH_SERVICE_URL = originalAuthUrl;
    }
  });

  it('accepts a Bearer token with an admin service role', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        user: { id: 'svc-1', roles: ['internal:marathon:admin'] },
      }),
    });
    await expect(
      new ServiceAuthGuard().canActivate(ctx({ authorization: 'Bearer good-token' })),
    ).resolves.toBe(true);
    expect(MARATHON_ADMIN_SERVICE_ROLES).toContain('internal:marathon:admin');
  });

  it('rejects a missing Authorization header', async () => {
    await expect(new ServiceAuthGuard().canActivate(ctx({}))).rejects.toThrow(UnauthorizedException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects x-api-key without Bearer', async () => {
    await expect(
      new ServiceAuthGuard().canActivate(ctx({ 'x-api-key': 'admin-key' })),
    ).rejects.toThrow(UnauthorizedException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a valid token without an admin role', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        user: { id: 'svc-1', roles: ['internal:marathon:readonly'] },
      }),
    });
    await expect(
      new ServiceAuthGuard().canActivate(ctx({ authorization: 'Bearer other-role' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an invalid Auth response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false }),
    });
    await expect(
      new ServiceAuthGuard().canActivate(ctx({ authorization: 'Bearer bad' })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
