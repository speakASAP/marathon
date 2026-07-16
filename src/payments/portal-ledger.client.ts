import { Logger } from '@nestjs/common';

/**
 * Sync confirmed marathon payments into speakasap-portal orders.Transaction ledger.
 * Fail-soft: marathon access must not roll back if portal is temporarily down.
 */
export class PortalLedgerClient {
  private readonly logger = new Logger(PortalLedgerClient.name);

  async recordPayment(payload: {
    email: string;
    amount: number | string;
    paymentMethod: string;
    title: string;
    externalPaymentId: string;
    marathonOrderId: string;
    confirmedAt?: string | Date | null;
    currency?: string;
    portalUserId?: string | null;
  }): Promise<'created' | 'exists' | 'skipped' | 'failed'> {
    const base = (process.env.SPEAKASAP_PORTAL_URL || process.env.SPEAKASAP_PORTAL_LEDGER_URL || '').replace(
      /\/$/,
      '',
    );
    if (!base) {
      this.logger.warn('SPEAKASAP_PORTAL_URL not configured; skipping portal ledger sync');
      return 'skipped';
    }

    const apiKey =
      process.env.SPEAKASAP_PORTAL_LEDGER_API_KEY ||
      process.env.MARATHON_ADMIN_API_KEY ||
      process.env.PAYMENT_WEBHOOK_API_KEY ||
      '';
    if (!apiKey) {
      this.logger.warn('No API key configured for portal ledger sync');
      return 'skipped';
    }

    const url = base.includes('/api/marathon/ledger')
      ? base
      : `${base}/api/marathon/ledger`;

    const body = {
      email: payload.email,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      title: payload.title,
      externalPaymentId: payload.externalPaymentId,
      paymentId: payload.externalPaymentId,
      marathonOrderId: payload.marathonOrderId,
      orderId: payload.marathonOrderId,
      confirmedAt:
        payload.confirmedAt instanceof Date
          ? payload.confirmedAt.toISOString()
          : payload.confirmedAt || undefined,
      currency: payload.currency || 'EUR',
      portalUserId: payload.portalUserId || undefined,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(body),
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
          `Portal ledger sync failed: status=${response.status} paymentId=${payload.externalPaymentId} body=${text.slice(0, 300)}`,
        );
        return 'failed';
      }
      const status = parsed.status === 'exists' ? 'exists' : 'created';
      this.logger.log(
        `Portal ledger sync ${status}: paymentId=${payload.externalPaymentId} email=${payload.email}`,
      );
      return status;
    } catch (error) {
      this.logger.error(
        `Portal ledger sync request failed: paymentId=${payload.externalPaymentId} error=${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return 'failed';
    }
  }
}
