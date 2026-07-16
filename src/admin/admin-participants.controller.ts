import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../shared/api-key.guard';
import { PrismaService } from '../shared/prisma.service';
import { AdminParticipantPaymentsService, AdminPaymentRecord } from './admin-participant-payments.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminParticipantPayment {
  orderId: string;
  amount: string;
  currency: string;
  status: string;
  confirmedAt: Date | null;
}

export interface AdminParticipantResult {
  marathonerId: string;
  marathonId: string;
  marathonTitle: string | null;
  email: string | null;
  name: string | null;
  paid: boolean;
  active: boolean;
  createdAt: Date;
  finishedAt: Date | null;
  payment: AdminParticipantPayment | null;
  /**
   * Authoritative financial records from payments-microservice for every
   * payment attempt of this participant, including refund transactions.
   * null when payments-microservice is unavailable (fail-soft).
   */
  payments: AdminPaymentRecord[] | null;
}

/**
 * Internal search endpoint for the portal manager UI.
 * Guarded by x-api-key (MARATHON_ADMIN_API_KEY / PAYMENT_WEBHOOK_API_KEY) —
 * returns PII, never expose unauthenticated.
 * Returns participation and payment facts only; no step submissions / progress data.
 */
@Controller('admin/participants')
@UseGuards(ApiKeyGuard)
export class AdminParticipantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly participantPayments: AdminParticipantPaymentsService,
  ) {}

  @Get('search')
  async search(@Query('email') email: string): Promise<{ results: AdminParticipantResult[] }> {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized || !EMAIL_PATTERN.test(normalized)) {
      throw new BadRequestException('Valid email query parameter is required');
    }
    const participants = await this.prisma.marathonParticipant.findMany({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      include: {
        marathon: true,
        paymentAttempts: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allOrderIds = participants.flatMap((p) => p.paymentAttempts.map((a) => a.orderId));
    const paymentsByOrderId = await this.participantPayments.getPaymentsByOrderIds(allOrderIds);

    return {
      results: participants.map((p) => {
        const confirmed = p.paymentAttempts
          .filter((a) => a.status === 'confirmed' && a.confirmedAt)
          .sort((a, b) => (b.confirmedAt as Date).getTime() - (a.confirmedAt as Date).getTime())[0];
        return {
          marathonerId: p.id,
          marathonId: p.marathonId,
          marathonTitle: p.marathon?.title ?? null,
          email: p.email,
          name: p.name,
          paid: p.paid,
          active: p.active,
          createdAt: p.createdAt,
          finishedAt: p.finishedAt,
          payment: confirmed
            ? {
                orderId: confirmed.orderId,
                amount: String(confirmed.amount),
                currency: confirmed.currency,
                status: confirmed.status,
                confirmedAt: confirmed.confirmedAt,
              }
            : null,
          payments:
            paymentsByOrderId === null
              ? null
              : p.paymentAttempts.flatMap((a) => paymentsByOrderId.get(a.orderId) || []),
        };
      }),
    };
  }
}
