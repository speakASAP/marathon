import { BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';
import { registerMarathonContact, type AuthUser } from '../shared/auth-client';

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

export type RegistrationAvailabilityRequest = {
  email?: string;
  phone?: string;
  languageCode?: string;
};

export type RegistrationAvailabilityResponse = {
  available: boolean;
  registered: boolean;
  loginRequired: boolean;
  message?: string;
  profilePath?: string;
  matched: {
    email: boolean;
    phone: boolean;
  };
};

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkAvailability(payload: RegistrationAvailabilityRequest): Promise<RegistrationAvailabilityResponse> {
    const email = payload.email?.trim().toLowerCase() || '';
    const phone = payload.phone?.trim() || '';

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const contactFilters = [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ];

    const existingParticipant = await this.prisma.marathonParticipant.findFirst({
      where: {
        active: true,
        OR: contactFilters,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, marathonId: true, email: true, phone: true },
    });

    if (!existingParticipant) {
      return {
        available: true,
        registered: false,
        loginRequired: false,
        matched: { email: false, phone: false },
      };
    }

    this.logger.warn(
      `marathon.registration.availability_blocked reason=existing_participant marathonerId=${existingParticipant.id} marathonId=${existingParticipant.marathonId}`,
    );

    return {
      available: false,
      registered: true,
      loginRequired: true,
      message: 'Этот email или телефон уже зарегистрирован. Войдите с паролем или восстановите доступ.',
      profilePath: `/profile/${existingParticipant.id}`,
      matched: {
        email: Boolean(email && existingParticipant.email?.trim().toLowerCase() === email),
        phone: Boolean(phone && existingParticipant.phone?.trim() === phone),
      },
    };
  }

  async register(payload: RegistrationRequest, authUser?: AuthUser): Promise<RegistrationResponse> {
    this.logger.log(
      `marathon.registration.service_requested hasEmail=${Boolean(payload.email)} hasPhone=${Boolean(payload.phone)} languageCode=${payload.languageCode || ''}`,
    );

    const userId = authUser?.id;
    const authName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim();
    const email = (payload.email || authUser?.email || '').trim().toLowerCase();
    const phone = (payload.phone || authUser?.phone || '').trim();
    const name = payload.name?.trim() || authUser?.name?.trim() || authName || undefined;

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

    if (userId) {
      const existingParticipant = await this.prisma.marathonParticipant.findFirst({
        where: {
          userId,
          marathonId: marathon.id,
        },
        orderBy: [
          { active: 'desc' },
          { createdAt: 'desc' },
        ],
        select: { id: true },
      });
      if (existingParticipant) {
        this.logger.log(
          `marathon.registration.reused_existing marathonerId=${existingParticipant.id} marathonId=${marathon.id} userBound=true`,
        );
        return {
          marathonerId: existingParticipant.id,
          redirectUrl: this.buildRedirectUrl(marathon.languageCode),
          userBound: true,
        };
      }

      if (!email) {
        throw new BadRequestException('This marathon is not linked to your account yet and your Auth profile has no email.');
      }
    }

    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (!userId && !phone) {
      throw new BadRequestException('Phone is required');
    }

    if (!userId) {
      const existingParticipant = await this.prisma.marathonParticipant.findFirst({
        where: {
          active: true,
          OR: [{ email }, { phone }],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, marathonId: true },
      });
      if (existingParticipant) {
        this.logger.warn(
          `marathon.registration.blocked reason=existing_participant marathonerId=${existingParticipant.id} marathonId=${existingParticipant.marathonId}`,
        );
        throw new ConflictException({
          code: 'EXISTING_MARATHON_ACCOUNT',
          message: 'Этот email или телефон уже зарегистрирован. Войдите с паролем или восстановите доступ.',
          loginRequired: true,
          profilePath: `/profile/${existingParticipant.id}`,
        });
      }
    }

    let centralUserId = userId;
    if (!centralUserId) {
      const authRegistration = await registerMarathonContact({ email, phone, name });
      if (!authRegistration) {
        throw new ServiceUnavailableException('Central authentication service is unavailable');
      }
      if (!authRegistration.isNewUser) {
        this.logger.warn('marathon.registration.blocked reason=existing_auth_user');
        throw new ConflictException({
          code: 'EXISTING_AUTH_ACCOUNT',
          message: 'Этот email или телефон уже зарегистрирован. Войдите с паролем или восстановите доступ.',
          loginRequired: true,
        });
      }
      centralUserId = authRegistration.userId;
    }

    const reportHour = new Date();
    reportHour.setMinutes(0, 0, 0);

    let participant;
    try {
      participant = await this.prisma.marathonParticipant.create({
        data: {
          marathonId: marathon.id,
          email,
          phone,
          name,
          userId: centralUserId,
          paid: false,
          bonusDaysLeft: 7,
          canUsePenalty: true,
          reportHour,
        },
      });
    } catch (error) {
      // Concurrent double-submit: the partial unique index on
      // ("userId","marathonId") WHERE active AND "finishedAt" IS NULL rejected a
      // duplicate created in the race window after the pre-create check. Reuse
      // the winning row so the endpoint stays idempotent.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.marathonParticipant.findFirst({
          where: { userId: centralUserId, marathonId: marathon.id, active: true, finishedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (existing) {
          this.logger.log(
            `marathon.registration.reused_existing marathonerId=${existing.id} marathonId=${marathon.id} userBound=${Boolean(centralUserId)} reason=unique_race`,
          );
          return {
            marathonerId: existing.id,
            redirectUrl: this.buildRedirectUrl(marathon.languageCode),
            userBound: Boolean(centralUserId),
          };
        }
      }
      throw error;
    }

    const redirectUrl = this.buildRedirectUrl(marathon.languageCode);

    if (email) {
      this.logger.log(`marathon.registration.notification_requested marathonerId=${participant.id} channel=email`);
      await this.notificationsService.send({
        channel: 'email',
        type: 'custom',
        recipient: email,
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
      `marathon.registration.service_created marathonerId=${participant.id} marathonId=${marathon.id} userBound=${Boolean(centralUserId)} notificationRequested=${Boolean(payload.email)}`,
    );

    return { marathonerId: participant.id, redirectUrl, userBound: Boolean(centralUserId) };
  }

  private buildRedirectUrl(languageCode: string): string | undefined {
    // Build redirect URL for the public short landing path: /{languageCode}
    const base = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    return base ? `${base}/${languageCode}` : undefined;
  }

  private assertRegistrationReady(marathon: {
    product: unknown | null;
    steps: { assignmentContent: string | null; isTrialStep: boolean; sequence: number; title: string }[];
  }): void {
    if (!marathon.product) {
      this.logger.warn('marathon.registration.blocked reason=missing_product');
      throw new BadRequestException('Registration is not open: payment product is not configured');
    }
    if (marathon.steps.length === 0) {
      this.logger.warn('marathon.registration.blocked reason=missing_steps');
      throw new BadRequestException('Registration is not open: marathon steps are not configured');
    }
    if (!marathon.steps.some((step) => !step.isTrialStep)) {
      this.logger.warn('marathon.registration.blocked reason=missing_assignment_path');
      throw new BadRequestException('Registration is not open: assignment path is not configured');
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
