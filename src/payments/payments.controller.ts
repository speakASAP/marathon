import { Body, Controller, Headers, HttpException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { AuthUser } from '../shared/auth-client';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

@Controller()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/checkout')
  @UseGuards(AuthGuard)
  async createCheckout(@Req() req: AuthenticatedRequest, @Body() body: { marathonerId?: string; paymentMethod?: string }) {
    const userId = req.user!.id;
    this.logger.log(`Payment checkout requested: userId=${userId}, marathonerId=${body.marathonerId || ''}`);
    try {
      return await this.paymentsService.createCheckout(req.user!, body);
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'marathon.checkout.failed hasMarathonerId=' + Boolean(body.marathonerId) + ' method=' + (body.paymentMethod || '') + ' status=' + status + ' reason=' + reason.replace(/\s+/g, '_'),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('payments/gift-redemptions')
  @UseGuards(AuthGuard)
  async redeemGift(@Req() req: AuthenticatedRequest, @Body() body: { marathonerId?: string; code?: string }) {
    const userId = req.user!.id;
    this.logger.log(`Gift redemption requested: userId=${userId}, marathonerId=${body.marathonerId || ''}`);
    this.logger.log('marathon.gift.requested hasMarathonerId=' + Boolean(body.marathonerId) + ' hasCode=' + Boolean(body.code));
    try {
      const result = await this.paymentsService.redeemGift(userId, body.marathonerId, body.code);
      this.logger.log('marathon.gift.redeemed hasRedirect=' + Boolean(result.redirectUrl));
      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'marathon.gift.failed hasMarathonerId=' + Boolean(body.marathonerId) + ' hasCode=' + Boolean(body.code) + ' status=' + status + ' reason=' + reason.replace(/\s+/g, '_'),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('payments/webhook')
  async paymentWebhook(@Headers('x-api-key') apiKey: string | string[] | undefined, @Body() body: Record<string, unknown>) {
    this.logger.log(`Payment callback received: orderId=${String(body.orderId || '')}, status=${String(body.status || '')}`);
    const callbackStatus = this.safeEventValue(String(body.status || ''));
    const callbackEvent = this.safeEventValue(String(body.event || ''));
    this.logger.log('marathon.payment_webhook.received hasOrderId=' + Boolean(body.orderId) + ' callbackStatus=' + callbackStatus + ' callbackEvent=' + callbackEvent);
    try {
      const result = await this.paymentsService.handlePaymentCallback(apiKey, body);
      this.logger.log('marathon.payment_webhook.' + (result.status === 'ignored' ? 'ignored' : 'confirmed') + ' callbackStatus=' + callbackStatus + ' callbackEvent=' + callbackEvent + ' idempotent=' + Boolean((result as { idempotent?: boolean }).idempotent));
      return result;
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'marathon.payment_webhook.failed hasOrderId=' + Boolean(body.orderId) + ' callbackStatus=' + callbackStatus + ' callbackEvent=' + callbackEvent + ' status=' + status + ' reason=' + reason.replace(/\s+/g, '_'),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private safeEventValue(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 80);
  }
}
