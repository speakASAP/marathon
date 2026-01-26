import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';

export type RegistrationRequest = {
  email: string;
  phone?: string;
  name?: string;
  password?: string;
  languageCode?: string;
};

export type RegistrationResponse = {
  marathonerId: string;
  redirectUrl?: string;
};

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(payload: RegistrationRequest): Promise<RegistrationResponse> {
    this.logger.log(`Registration requested for ${payload.email}`);

    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const marathon = await this.prisma.marathon.findFirst({
      where: {
        languageCode: payload.languageCode,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!marathon) {
      throw new BadRequestException('No active marathon found');
    }

    const reportHour = new Date();
    reportHour.setMinutes(0, 0, 0);

    const participant = await this.prisma.marathonParticipant.create({
      data: {
        marathonId: marathon.id,
        email: payload.email,
        phone: payload.phone,
        name: payload.name,
        isFree: true,
        vipRequired: !!marathon.vipGateDate,
        reportHour,
      },
    });

    // Build redirect URL matching legacy: marathon.get_absolute_url() -> /marathon/{languageCode}
    const base = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const redirectUrl = base ? `${base}/marathon/${marathon.languageCode}` : undefined;

    if (payload.email) {
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

    return { marathonerId: participant.id, redirectUrl };
  }
}
