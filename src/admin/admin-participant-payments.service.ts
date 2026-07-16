import { Injectable, Logger } from '@nestjs/common';

const REQUEST_TIMEOUT_MS = 2500;
const MAX_ORDER_IDS_PER_REQUEST = 50;

export interface AdminPaymentTransaction {
  id: string;
  transactionType: string;
  amount: string;
  status: string;
  createdAt: string;
}

export interface AdminPaymentRecord {
  paymentId: string;
  orderId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
  transactions: AdminPaymentTransaction[];
}

/**
 * Fetches authoritative payment + transaction records from payments-microservice
 * for the admin participants search. Fail-soft: returns null when the payments
 * service is unavailable so the endpoint still serves participation facts.
 */
@Injectable()
export class AdminParticipantPaymentsService {
  private readonly logger = new Logger(AdminParticipantPaymentsService.name);

  async getPaymentsByOrderIds(orderIds: string[]): Promise<Map<string, AdminPaymentRecord[]> | null> {
    const normalized = (orderIds || []).map((id) => (id || '').trim()).filter(Boolean);
    if (normalized.length === 0) {
      return new Map();
    }

    const apiKey = process.env.PAYMENT_API_KEY;
    if (!apiKey) {
      this.logger.warn('PAYMENT_API_KEY not configured; skipping payments enrichment');
      return null;
    }
    const applicationId = process.env.PAYMENT_APPLICATION_ID || 'marathon';
    const baseUrl = (process.env.PAYMENT_SERVICE_URL || 'http://payments-microservice:3468').replace(/\/$/, '');

    const byOrderId = new Map<string, AdminPaymentRecord[]>();
    try {
      for (let offset = 0; offset < normalized.length; offset += MAX_ORDER_IDS_PER_REQUEST) {
        const chunk = normalized.slice(offset, offset + MAX_ORDER_IDS_PER_REQUEST);
        const url =
          `${baseUrl}/payments/transactions/by-order-ids?applicationId=${encodeURIComponent(applicationId)}` +
          `&orderIds=${encodeURIComponent(chunk.join(','))}`;
        const response = await fetch(url, {
          headers: { 'X-API-Key': apiKey },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          this.logger.warn(`payments transactions lookup returned ${response.status}`);
          return null;
        }
        const body = (await response.json()) as { data?: { payments?: AdminPaymentRecord[] } };
        for (const payment of body?.data?.payments || []) {
          const existing = byOrderId.get(payment.orderId) || [];
          existing.push(payment);
          byOrderId.set(payment.orderId, existing);
        }
      }
      return byOrderId;
    } catch (error) {
      this.logger.warn(
        `payments transactions lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
