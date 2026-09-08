import { Logger } from '@nestjs/common';

/**
 * Bridge marathon checkouts into speakasap-portal's standard payment process.
 *
 * 1) registerPending — create unpaid Order + pending ExternalPayment
 * 2) confirmViaWebhook — hit /api/payments/webhook so ExternalPayment.pay() runs
 *
 * Auth: MARATHON_TO_PORTAL_TOKEN (Auth-minted RS256 pair JWT) as Authorization Bearer.
 * Missing SPEAKASAP_PORTAL_URL or token fails closed (throws).
 */
export class PortalPaymentClient {
  private readonly logger = new Logger(PortalPaymentClient.name);

  private portalBase(): string {
    const base = (process.env.SPEAKASAP_PORTAL_URL || '').replace(/\/$/, '').trim();
    if (!base) {
      throw new Error('SPEAKASAP_PORTAL_URL is required for portal payment bridge');
    }
    return base;
  }

  private serviceToken(): string {
    const token = (process.env.MARATHON_TO_PORTAL_TOKEN || '').trim();
    if (!token) {
      throw new Error(
        'MARATHON_TO_PORTAL_TOKEN (Auth-minted RS256) is required for portal payment bridge',
      );
    }
    return token;
  }

  private authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.serviceToken()}`,
    };
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
    // Carried through so the portal can register a buyer who has no legacy
    // account yet — both systems hold the account during the transition.
    name?: string | null;
    phone?: string | null;
  }): Promise<'registered' | 'exists' | 'failed'> {
    const url = `${this.portalBase()}/api/marathon/payment/register`;
    const headers = this.authHeaders();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
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
          name: payload.name || undefined,
          phone: payload.phone || undefined,
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
  }): Promise<'confirmed' | 'failed'> {
    const url = `${this.portalBase()}/api/payments/webhook`;
    const headers = this.authHeaders();
    const timestamp =
      payload.timestamp instanceof Date
        ? payload.timestamp.toISOString()
        : payload.timestamp || new Date().toISOString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
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
