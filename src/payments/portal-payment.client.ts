import { Logger } from '@nestjs/common';

/**
 * Bridge marathon checkouts into speakasap-portal's standard payment process.
 *
 * 1) registerPending — create unpaid Order + pending ExternalPayment
 * 2) confirmViaWebhook — hit /api/payments/webhook so ExternalPayment.pay() runs
 *
 * Fail-soft: marathon access must not roll back if portal is temporarily down.
 */
export class PortalPaymentClient {
  private readonly logger = new Logger(PortalPaymentClient.name);

  private portalBase(): string {
    return (process.env.SPEAKASAP_PORTAL_URL || process.env.SPEAKASAP_PORTAL_LEDGER_URL || '').replace(
      /\/$/,
      '',
    );
  }

  private apiKey(): string {
    return (
      process.env.SPEAKASAP_PORTAL_LEDGER_API_KEY ||
      process.env.SPEAKASAP_PORTAL_PAYMENT_API_KEY ||
      process.env.MARATHON_ADMIN_API_KEY ||
      process.env.PAYMENT_WEBHOOK_API_KEY ||
      ''
    );
  }

  async registerPending(payload: {
    email: string;
    amount: number | string;
    paymentMethod: string;
    title: string;
    externalPaymentId: string;
    marathonOrderId: string;
    currency?: string;
    portalUserId?: string | null;
  }): Promise<'registered' | 'exists' | 'skipped' | 'failed'> {
    const base = this.portalBase();
    if (!base) {
      this.logger.warn('SPEAKASAP_PORTAL_URL not configured; skipping portal payment register');
      return 'skipped';
    }
    const apiKey = this.apiKey();
    if (!apiKey) {
      this.logger.warn('No API key configured for portal payment register');
      return 'skipped';
    }

    const url = `${base}/api/marathon/payment/register`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          email: payload.email,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          title: payload.title,
          externalPaymentId: payload.externalPaymentId,
          paymentId: payload.externalPaymentId,
          marathonOrderId: payload.marathonOrderId,
          orderId: payload.marathonOrderId,
          currency: payload.currency || 'EUR',
          portalUserId: payload.portalUserId || undefined,
        }),
      });
      const text = await response.text();
      let parsed: { status?: string; message?: string } = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = {};
      }
      if (!response.ok) {
        this.logger.error(
          `Portal payment register failed: status=${response.status} paymentId=${payload.externalPaymentId} body=${text.slice(0, 300)}`,
        );
        return 'failed';
      }
      const status = parsed.status === 'exists' ? 'exists' : 'registered';
      this.logger.log(
        `Portal payment register ${status}: paymentId=${payload.externalPaymentId} email=${payload.email}`,
      );
      return status;
    } catch (error) {
      this.logger.error(
        `Portal payment register request failed: paymentId=${payload.externalPaymentId} error=${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return 'failed';
    }
  }

  async confirmViaWebhook(payload: {
    externalPaymentId: string;
    marathonOrderId: string;
    paymentMethod?: string;
    amount?: number | string;
    currency?: string;
    timestamp?: string | Date | null;
  }): Promise<'confirmed' | 'skipped' | 'failed'> {
    const base = this.portalBase();
    if (!base) {
      this.logger.warn('SPEAKASAP_PORTAL_URL not configured; skipping portal payment webhook');
      return 'skipped';
    }
    const apiKey = this.apiKey();
    if (!apiKey) {
      this.logger.warn('No API key configured for portal payment webhook');
      return 'skipped';
    }

    const url = `${base}/api/payments/webhook`;
    const timestamp =
      payload.timestamp instanceof Date
        ? payload.timestamp.toISOString()
        : payload.timestamp || new Date().toISOString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          paymentId: payload.externalPaymentId,
          orderId: payload.marathonOrderId,
          status: 'completed',
          event: 'completed',
          paymentMethod: payload.paymentMethod || 'stripe',
          timestamp,
          amount: payload.amount,
          currency: payload.currency || 'EUR',
          metadata: {
            source: 'marathon-service',
          },
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        this.logger.error(
          `Portal payment webhook failed: status=${response.status} paymentId=${payload.externalPaymentId} body=${text.slice(0, 300)}`,
        );
        return 'failed';
      }
      this.logger.log(
        `Portal payment webhook ok: paymentId=${payload.externalPaymentId} orderId=${payload.marathonOrderId}`,
      );
      return 'confirmed';
    } catch (error) {
      this.logger.error(
        `Portal payment webhook request failed: paymentId=${payload.externalPaymentId} error=${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return 'failed';
    }
  }
}
