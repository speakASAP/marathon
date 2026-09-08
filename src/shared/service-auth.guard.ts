import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

type AuthValidateResponse = {
  valid?: boolean;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    roles?: unknown;
  };
};

/** Portal manager UI → marathon admin API. */
export const MARATHON_ADMIN_SERVICE_ROLES = ['internal:marathon:admin'] as const;

/** payments-microservice → marathon payment application callback. */
export const MARATHON_PAYMENT_CALLBACK_ROLES = ['internal:marathon:service'] as const;

/**
 * Auth RS256 gate for marathon S2S routes.
 * Bearer only → POST /auth/validate with a route-specific least-privilege role.
 * S2S: auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md (no dual-accept).
 */
abstract class BaseServiceAuthGuard implements CanActivate {
  protected abstract readonly requiredRoles: readonly string[];

  private readonly authServiceUrl = (
    process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370'
  ).replace(/\/+$/, '');
  private readonly authValidateTimeoutMs = Number(process.env.AUTH_VALIDATE_TIMEOUT_MS || 3000);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.validateBearer(token);
    const roles = Array.isArray(user.roles)
      ? user.roles.filter((role): role is string => typeof role === 'string')
      : [];

    if (!this.requiredRoles.some((role) => roles.includes(role))) {
      throw new ForbiddenException('Principal lacks the required role');
    }

    (request as Request & { user?: unknown }).user = {
      id: user.id || user.sub,
      email: user.email,
      roles,
    };
    return true;
  }

  private async validateBearer(token: string): Promise<NonNullable<AuthValidateResponse['user']>> {
    const controller = new AbortController();
    const timeoutMs =
      Number.isFinite(this.authValidateTimeoutMs) && this.authValidateTimeoutMs > 0
        ? this.authValidateTimeoutMs
        : 3000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.authServiceUrl}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'marathon_admin_auth_validate_unreachable',
          message: 'Auth validate unreachable during admin route check',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw new UnauthorizedException('Invalid token');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid token');
    }

    let validation: AuthValidateResponse;
    try {
      validation = (await response.json()) as AuthValidateResponse;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!validation.valid || !validation.user) {
      throw new UnauthorizedException('Invalid token');
    }

    return validation.user;
  }
}

/** Admin participants search — portal holds internal:marathon:admin. */
@Injectable()
export class ServiceAuthGuard extends BaseServiceAuthGuard {
  protected readonly requiredRoles = MARATHON_ADMIN_SERVICE_ROLES;
}

/** Payment application callback — payments-ms holds internal:marathon:service. */
@Injectable()
export class PaymentCallbackAuthGuard extends BaseServiceAuthGuard {
  protected readonly requiredRoles = MARATHON_PAYMENT_CALLBACK_ROLES;
}
