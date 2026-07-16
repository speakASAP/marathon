import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../shared/api-key.guard';
import { PrismaService } from '../shared/prisma.service';

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
}

/**
 * Internal search endpoint for the portal manager UI.
 * Guarded by x-api-key (PAYMENT_WEBHOOK_API_KEY) — returns PII, never expose unauthenticated.
 * Returns participation and payment facts only; no step submissions / progress data.
 */
@Controller('admin/participants')
@UseGuards(ApiKeyGuard)
export class AdminParticipantsController {
  constructor(private readonly prisma: PrismaService) {}

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
        paymentAttempts: {
          where: { status: 'confirmed' },
          orderBy: { confirmedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      results: participants.map((p) => ({
        marathonerId: p.id,
        marathonId: p.marathonId,
        marathonTitle: p.marathon?.title ?? null,
        email: p.email,
        name: p.name,
        paid: p.paid,
        active: p.active,
        createdAt: p.createdAt,
        finishedAt: p.finishedAt,
        payment: p.paymentAttempts[0]
          ? {
              orderId: p.paymentAttempts[0].orderId,
              amount: String(p.paymentAttempts[0].amount),
              currency: p.paymentAttempts[0].currency,
              status: p.paymentAttempts[0].status,
              confirmedAt: p.paymentAttempts[0].confirmedAt,
            }
          : null,
      })),
    };
  }
}
