import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guards internal admin endpoints via the `x-api-key` header. Accepts either
 * MARATHON_ADMIN_API_KEY (the key the speakasap portal holds as
 * MARATHON_API_KEY) or PAYMENT_WEBHOOK_API_KEY (payments-microservice).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['x-api-key'];
    const provided = String(Array.isArray(header) ? header[0] : header || '');
    const allowed = [process.env.MARATHON_ADMIN_API_KEY, process.env.PAYMENT_WEBHOOK_API_KEY].filter(
      (key): key is string => Boolean(key),
    );
    if (!provided || !allowed.includes(provided)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
