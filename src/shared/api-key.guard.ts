import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guards internal admin endpoints with the same API key used by the payment
 * webhook (PAYMENT_WEBHOOK_API_KEY), passed via the `x-api-key` header.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['x-api-key'];
    const provided = String(Array.isArray(header) ? header[0] : header || '');
    const expected = process.env.PAYMENT_WEBHOOK_API_KEY || '';
    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
