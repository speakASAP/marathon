import { Body, Controller, Headers, HttpException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { AuthUser } from '../shared/auth-client';
import { VipService } from './vip.service';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

@Controller()
export class VipController {
  private readonly logger = new Logger(VipController.name);

  constructor(private readonly vipService: VipService) {}

  @Post('vip/checkout')
  @UseGuards(AuthGuard)
  async createCheckout(@Req() req: AuthenticatedRequest, @Body() body: { marathonerId?: string; paymentMethod?: string }) {
    const userId = req.user!.id;
    this.logger.log(`VIP checkout requested: userId=${userId}, marathonerId=${body.marathonerId || ''}`);
    try {
      return await this.vipService.createCheckout(req.user!, body);
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

  @Post('vip/gift-redemptions')
  @UseGuards(AuthGuard)
  async redeemGift(@Req() req: AuthenticatedRequest, @Body() body: { marathonerId?: string; code?: string }) {
    const userId = req.user!.id;
    this.logger.log(`Gift redemption requested: userId=${userId}, marathonerId=${body.marathonerId || ''}`);
    return this.vipService.redeemGift(userId, body.marathonerId, body.code);
  }

  @Post('payments/webhook')
  async paymentWebhook(@Headers('x-api-key') apiKey: string | string[] | undefined, @Body() body: Record<string, unknown>) {
    this.logger.log(`Payment callback received: orderId=${String(body.orderId || '')}, status=${String(body.status || '')}`);
    return this.vipService.handlePaymentCallback(apiKey, body);
  }
}
