import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../shared/auth-client';
import { PrismaService } from '../shared/prisma.service';

const TEST_PAYMENT_EMAIL = 'test@example.com';
const TEST_ADMIN_EMAILS = ['test@example.com', 'ssfskype@gmail.com'] as const;

export type UpdateTestPaymentInput = {
  participantId?: unknown;
  paid?: unknown;
  expectedPaid?: unknown;
};

export type AdminTestPaymentParticipant = {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  paid: boolean;
  createdAt: string;
  marathon: {
    id: string;
    title: string;
    languageCode: string;
    slug: string;
  };
};

export type AdminTestPaymentResponse = {
  testEmail: string;
  participants: AdminTestPaymentParticipant[];
};

type ParticipantWithMarathon = {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  paid: boolean;
  createdAt: Date;
  marathon: {
    id: string;
    title: string;
    languageCode: string;
    slug: string;
  };
};

@Injectable()
export class AdminTestingService {
  private readonly logger = new Logger(AdminTestingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listTestPaymentParticipants(user: AuthUser): Promise<AdminTestPaymentResponse> {
    this.assertTestAdmin(user);
    const participants = await this.prisma.marathonParticipant.findMany({
      where: this.testParticipantWhere(),
      include: {
        marathon: {
          select: {
            id: true,
            title: true,
            languageCode: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { active: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      testEmail: TEST_PAYMENT_EMAIL,
      participants: participants.map((participant) => this.mapParticipant(participant)),
    };
  }

  async updateTestPayment(user: AuthUser, input: UpdateTestPaymentInput): Promise<void> {
    this.assertTestAdmin(user);
    const participantId = this.parseParticipantId(input.participantId);
    const paid = this.parsePaid(input.paid);
    const expectedPaid = this.parseExpectedPaid(input.expectedPaid);

    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: participantId,
        ...this.testParticipantWhere(),
      },
      select: {
        id: true,
        paid: true,
        active: true,
      },
    });

    if (!participant) {
      throw new NotFoundException(`Test participant for ${TEST_PAYMENT_EMAIL} was not found`);
    }
    if (!participant.active) {
      throw new BadRequestException('Test participant is not active');
    }
    if (expectedPaid != null && participant.paid !== expectedPaid) {
      throw new ConflictException('Test participant payment status changed; reload admin testing panel');
    }
    if (participant.paid === paid) {
      return;
    }

    await this.prisma.marathonParticipant.update({
      where: { id: participant.id },
      data: { paid },
    });

    this.logger.log(
      `Admin test payment toggled: userId=${user.id}, participantId=${participant.id}, paid=${paid}`,
    );
  }

  private testParticipantWhere() {
    return {
      email: {
        equals: TEST_PAYMENT_EMAIL,
        mode: 'insensitive' as const,
      },
    };
  }

  private mapParticipant(participant: ParticipantWithMarathon): AdminTestPaymentParticipant {
    return {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      active: participant.active,
      paid: participant.paid,
      createdAt: participant.createdAt.toISOString(),
      marathon: participant.marathon,
    };
  }

  private assertAdmin(user: AuthUser): void {
    const userIds = this.csvSet(process.env.MARATHON_ADMIN_USER_IDS);
    const emails = this.csvSet(process.env.MARATHON_ADMIN_EMAILS);
    const email = user.email?.trim().toLowerCase() || '';
    const userId = user.id.trim().toLowerCase();
    if (!userIds.has(userId) && (!email || !emails.has(email))) {
      throw new ForbiddenException('Marathon admin access required');
    }
  }

  private assertTestAdmin(user: AuthUser): void {
    this.assertAdmin(user);
    const email = user.email?.trim().toLowerCase() || '';
    if (!TEST_ADMIN_EMAILS.includes(email as typeof TEST_ADMIN_EMAILS[number])) {
      throw new ForbiddenException(`Test payment controls are limited to Marathon test admins`);
    }
  }

  private csvSet(value: string | undefined): Set<string> {
    return new Set((value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  }

  private parseParticipantId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('participantId is required');
    }
    return value.trim();
  }

  private parsePaid(value: unknown): boolean {
    if (typeof value !== 'boolean') {
      throw new BadRequestException('paid must be a boolean');
    }
    return value;
  }

  private parseExpectedPaid(value: unknown): boolean | null {
    if (value == null) return null;
    if (typeof value !== 'boolean') {
      throw new BadRequestException('expectedPaid must be a boolean');
    }
    return value;
  }
}
