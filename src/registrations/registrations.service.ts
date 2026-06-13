import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';

export type RegistrationRequest = {
  email?: string;
  phone?: string;
  name?: string;
  password?: string;
  languageCode?: string;
};

export type RegistrationResponse = {
  marathonerId: string;
  redirectUrl?: string;
  userBound: boolean;
};

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(payload: RegistrationRequest, userId?: string): Promise<RegistrationResponse> {
    this.logger.log(
      `marathon.registration.service_requested hasEmail=${Boolean(payload.email)} hasPhone=${Boolean(payload.phone)} languageCode=${payload.languageCode || ''}`,
    );

    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }
    const languageCode = payload.languageCode?.trim();
    if (!languageCode) {
      throw new BadRequestException('languageCode is required');
    }

    const marathon = await this.prisma.marathon.findFirst({
      where: {
        languageCode,
        active: true,
      },
      include: {
        product: true,
        gifts: {
          where: { usedAt: null },
          select: { id: true },
        },
        steps: {
          orderBy: { sequence: 'asc' },
          select: {
            assignmentContent: true,
            isTrialStep: true,
            sequence: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!marathon) {
      this.logger.warn(`marathon.registration.blocked reason=no_active_marathon languageCode=${languageCode}`);
      throw new BadRequestException('No active marathon found');
    }
    this.assertRegistrationReady(marathon);

    const reportHour = new Date();
    reportHour.setMinutes(0, 0, 0);

    const participant = await this.prisma.marathonParticipant.create({
      data: {
        marathonId: marathon.id,
        email: payload.email,
        phone: payload.phone,
        name: payload.name,
        userId,
        isFree: true,
        vipRequired: !!marathon.vipGateDate,
        reportHour,
      },
    });

    // Build redirect URL matching legacy: marathon.get_absolute_url() -> /marathon/{languageCode}
    const base = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const redirectUrl = base ? `${base}/marathon/${marathon.languageCode}` : undefined;

    if (payload.email) {
      this.logger.log(`marathon.registration.notification_requested marathonerId=${participant.id} channel=email`);
      await this.notificationsService.send({
        channel: 'email',
        type: 'custom',
        recipient: payload.email,
        subject: 'Marathon registration',
        message: `Registration completed for ${marathon.title}.`,
        templateData: {
          marathonId: marathon.id,
          marathonerId: participant.id,
          languageCode: marathon.languageCode,
        },
      });
    }

    this.logger.log(
      `marathon.registration.service_created marathonerId=${participant.id} marathonId=${marathon.id} userBound=${Boolean(userId)} notificationRequested=${Boolean(payload.email)}`,
    );

    return { marathonerId: participant.id, redirectUrl, userBound: Boolean(userId) };
  }

  private assertRegistrationReady(marathon: {
    product: unknown | null;
    gifts: { id: string }[];
    steps: { assignmentContent: string | null; isTrialStep: boolean; sequence: number; title: string }[];
  }): void {
    if (!marathon.product) {
      this.logger.warn('marathon.registration.blocked reason=missing_product');
      throw new BadRequestException('Registration is not open: VIP product is not configured');
    }
    if (marathon.gifts.length === 0) {
      this.logger.warn('marathon.registration.blocked reason=missing_gift_inventory');
      throw new BadRequestException('Registration is not open: gift-code inventory is not configured');
    }
    if (marathon.steps.length === 0) {
      this.logger.warn('marathon.registration.blocked reason=missing_steps');
      throw new BadRequestException('Registration is not open: marathon steps are not configured');
    }
    if (!marathon.steps.some((step) => !step.isTrialStep)) {
      this.logger.warn('marathon.registration.blocked reason=missing_post_gate_path');
      throw new BadRequestException('Registration is not open: post-gate assignment path is not configured');
    }
    const missingContent = marathon.steps.find((step) => !step.assignmentContent?.trim());
    if (missingContent) {
      this.logger.warn(`marathon.registration.blocked reason=missing_step_content sequence=${missingContent.sequence}`);
      throw new BadRequestException(
        `Registration is not open: assignment content is missing for step ${missingContent.sequence} (${missingContent.title})`,
      );
    }
  }
}
