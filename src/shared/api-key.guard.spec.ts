import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function ctx(headers: Record<string, string>) {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as never;
}

describe('ApiKeyGuard', () => {
  const originalKey = process.env.PAYMENT_WEBHOOK_API_KEY;
  const originalAdminKey = process.env.MARATHON_ADMIN_API_KEY;

  beforeEach(() => {
    process.env.PAYMENT_WEBHOOK_API_KEY = 'test-key';
    process.env.MARATHON_ADMIN_API_KEY = 'admin-key';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.PAYMENT_WEBHOOK_API_KEY;
    } else {
      process.env.PAYMENT_WEBHOOK_API_KEY = originalKey;
    }
    if (originalAdminKey === undefined) {
      delete process.env.MARATHON_ADMIN_API_KEY;
    } else {
      process.env.MARATHON_ADMIN_API_KEY = originalAdminKey;
    }
  });

  it('accepts the dedicated admin key', () => {
    expect(new ApiKeyGuard().canActivate(ctx({ 'x-api-key': 'admin-key' }))).toBe(true);
  });

  it('rejects the admin key value when its env is unset', () => {
    delete process.env.MARATHON_ADMIN_API_KEY;
    expect(() => new ApiKeyGuard().canActivate(ctx({ 'x-api-key': 'admin-key' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts the correct key', () => {
    expect(new ApiKeyGuard().canActivate(ctx({ 'x-api-key': 'test-key' }))).toBe(true);
  });

  it('rejects a wrong key', () => {
    expect(() => new ApiKeyGuard().canActivate(ctx({ 'x-api-key': 'nope' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing key header', () => {
    expect(() => new ApiKeyGuard().canActivate(ctx({}))).toThrow(UnauthorizedException);
  });

  it('rejects when key env is unset', () => {
    delete process.env.PAYMENT_WEBHOOK_API_KEY;
    expect(() => new ApiKeyGuard().canActivate(ctx({ 'x-api-key': 'test-key' }))).toThrow(
      UnauthorizedException,
    );
  });
});
