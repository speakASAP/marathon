import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type Answer = {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
  can_open: boolean;
  is_scheduled_future: boolean;
  block_reason?: string | null;
};

export type MarathonMedal = 'gold' | 'silver' | 'bronze';

export type MyMarathon = {
  title: string;
  languageCode: string;
  payment_status: 'paid' | 'unpaid';
  payment_required: boolean;
  registered: boolean;
  id: string;
  bonus_total: number;
  bonus_left: number;
  can_change_report_time: boolean;
  report_time: string | null;
  report_time_label: string | null;
  current_step: Answer | null;
  answers: Answer[];
  finished_at: string | null;
  medal: MarathonMedal | null;
  nps_survey: MyMarathonSurvey | null;
  can_generate_progress_report: boolean;
};

export type MarathonReportTimeInput = {
  reportTime?: string;
  timeZone?: string;
};

export type MyMarathonSurvey = {
  score: number;
  comment: string | null;
  submitted_at: string;
};

export type MarathonUserProfileSettings = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  bio: string;
};

export type MarathonUserProfileInput = {
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
};

export type ProgressReportStep = {
  stepId: string;
  sequence: number;
  title: string;
  state: string;
  isTrialStep: boolean;
  isLate: boolean;
  start: string;
  stop: string;
  submittedAt: string | null;
  rating: number | null;
  blockReason?: string | null;
};

export type MyMarathonProgressReport = {
  generatedAt: string;
  participant: {
    id: string;
    name: string | null;
    email: string | null;
    active: boolean;
    registeredAt: string;
    finishedAt: string | null;
  };
  marathon: {
    id: string;
    title: string;
    languageCode: string;
    slug: string;
  };
  access: {
    paymentStatus: 'paid' | 'unpaid';
    paymentRequired: boolean;
    paid: boolean;
    bonusDaysLeft: number;
    bonusDaysTotal: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    checkedSteps: number;
    activeSteps: number;
    lockedSteps: number;
    lateSteps: number;
    trialSteps: number;
    gatedSteps: number;
    completionPercent: number;
    penaltyReports: number;
    paymentAttempts: number;
  };
  currentStep: ProgressReportStep | null;
  steps: ProgressReportStep[];
  paymentAttempts: Array<{
    orderId: string;
    status: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    createdAt: string;
    confirmedAt: string | null;
  }>;
};

const BONUS_DAYS = 7;
const MIN_NEXT_STEP_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DEADLINE_RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const DEADLINE_RECONCILIATION_BATCH_SIZE = 100;
const DEADLINE_RECONCILIATION_LOOKBACK_MINUTES = 15;

type DeadlineCandidate = { id: string };

@Injectable()
export class MeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MeService.name);
  private deadlineReconciliationTimer: ReturnType<typeof setInterval> | null = null;
  private deadlineReconciliationInitialTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineReconciliationRunning = false;

  onModuleInit(): void {
    const intervalMs = this.getDeadlineReconciliationIntervalMs();
    if (intervalMs <= 0) {
      this.logger.log('Marathon deadline reconciliation loop disabled');
      return;
    }

    this.deadlineReconciliationInitialTimer = setTimeout(() => {
      this.runDeadlineReconciliation('startup').catch((error) => {
        this.logger.error(
          `Marathon deadline reconciliation startup run failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, 30_000);

    this.deadlineReconciliationTimer = setInterval(() => {
      this.runDeadlineReconciliation('interval').catch((error) => {
        this.logger.error(
          `Marathon deadline reconciliation interval run failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.deadlineReconciliationInitialTimer) {
      clearTimeout(this.deadlineReconciliationInitialTimer);
      this.deadlineReconciliationInitialTimer = null;
    }
    if (this.deadlineReconciliationTimer) {
      clearInterval(this.deadlineReconciliationTimer);
      this.deadlineReconciliationTimer = null;
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string): Promise<MarathonUserProfileSettings> {
    const [profile, participant] = await Promise.all([
      this.prisma.marathonUserProfile.findUnique({ where: { userId } }),
      this.prisma.marathonParticipant.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, phone: true },
      }),
    ]);

    return {
      displayName: profile?.displayName || participant?.name || '',
      email: participant?.email || '',
      phone: participant?.phone || '',
      avatarUrl: profile?.avatarUrl || '',
      bio: profile?.bio || '',
    };
  }

  async updateUserProfile(userId: string, input: MarathonUserProfileInput): Promise<MarathonUserProfileSettings> {
    const currentParticipant = await this.prisma.marathonParticipant.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { email: true, phone: true },
    });
    const displayName = this.normalizeProfileText(input.displayName, 120, "Name");
    const email = input.email === undefined ? currentParticipant?.email || null : this.normalizeEmail(input.email);
    const phone = input.phone === undefined ? currentParticipant?.phone || null : this.normalizeProfileText(input.phone, 40, "Phone");
    const bio = this.normalizeProfileText(input.bio, 500, "Profile bio");
    const avatarUrl = this.normalizeAvatarUrl(input.avatarUrl);

    if (email || phone) {
      const duplicateParticipant = await this.prisma.marathonParticipant.findFirst({
        where: {
          active: true,
          NOT: { userId },
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
        select: { id: true },
      });
      if (duplicateParticipant) {
        throw new BadRequestException('Этот email или телефон уже используется другим участником марафона.');
      }
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const savedProfile = await tx.marathonUserProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName,
          avatarUrl,
          bio,
          avatarSource: avatarUrl ? 'user' : 'generated',
        },
        update: {
          displayName,
          avatarUrl,
          bio,
          avatarSource: avatarUrl ? 'user' : 'generated',
        },
      });

      await tx.marathonParticipant.updateMany({
        where: { userId },
        data: { name: displayName, email, phone },
      });

      return savedProfile;
    });

    return {
      displayName: profile.displayName || '',
      email: email || '',
      phone: phone || '',
      avatarUrl: profile.avatarUrl || '',
      bio: profile.bio || '',
    };
  }

  async listMarathons(userId: string): Promise<MyMarathon[]> {
    this.logger.debug(`My marathons list requested (userId=${userId})`);

    const participants = await this.prisma.marathonParticipant.findMany({
      where: { userId },
      orderBy: [
        { active: 'desc' },
        { finishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        marathon: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        submissions: {
          include: {
            step: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        surveyResponse: true,
        penaltyReports: true,
      },
    });

    const participantByLanguage = new Map<string, (typeof participants)[number]>();
    for (const participant of participants) {
      const languageCode = participant.marathon.languageCode;
      if (!participantByLanguage.has(languageCode)) {
        participantByLanguage.set(languageCode, participant);
      }
    }

    return Array.from(participantByLanguage.values()).map((participant) => this.mapToMyMarathon(participant));
  }

  async getMarathonById(userId: string, marathonerId: string): Promise<MyMarathon | null> {
    this.logger.debug(`My marathon requested (userId=${userId}, marathonerId=${marathonerId})`);

    let participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        OR: [{ userId }, { userId: null }],
      },
      include: {
        marathon: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        submissions: {
          include: {
            step: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        surveyResponse: true,
        penaltyReports: true,
      },
    });

    if (!participant) {
      return null;
    }

    if (!participant.userId) {
      participant = await this.prisma.marathonParticipant.update({
        where: { id: participant.id },
        data: { userId },
        include: {
          marathon: {
            include: {
              steps: {
                orderBy: { sequence: 'asc' },
              },
            },
          },
          submissions: {
            include: {
              step: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          surveyResponse: true,
          penaltyReports: true,
        },
      });
    }

    participant = await this.reconcileMissedDeadlines(participant);
    return this.mapToMyMarathon(participant);
  }

  async getProgressReport(userId: string, marathonerId: string): Promise<MyMarathonProgressReport | null> {
    this.logger.debug(`My marathon progress report requested (userId=${userId}, marathonerId=${marathonerId})`);

    let participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        OR: [{ userId }, { userId: null }],
      },
      include: {
        marathon: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        submissions: {
          include: {
            step: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        penaltyReports: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        paymentAttempts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        surveyResponse: true,
      },
    });

    if (!participant) {
      return null;
    }

    if (!participant.userId) {
      participant = await this.prisma.marathonParticipant.update({
        where: { id: participant.id },
        data: { userId },
        include: {
          marathon: {
            include: {
              steps: {
                orderBy: { sequence: 'asc' },
              },
            },
          },
          submissions: {
            include: {
              step: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          penaltyReports: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          paymentAttempts: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          surveyResponse: true,
        },
      });
    }

    if (this.calculatePaymentRequired(participant, this.latestStep(participant.submissions), participant.marathon)) {
      throw new ForbiddenException('Marathon payment is required before generating a progress report');
    }

    if (!this.canGenerateProgressReport(participant)) {
      throw new BadRequestException('Progress report is available after a checked completed step');
    }

    return this.mapToProgressReport(participant);
  }

  async updateReportTime(
    userId: string,
    marathonerId: string,
    input: MarathonReportTimeInput,
  ): Promise<MyMarathon | null> {
    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        userId,
      },
      include: {
        marathon: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        submissions: {
          include: {
            step: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        surveyResponse: true,
        penaltyReports: true,
      },
    });

    if (!participant) {
      return null;
    }

    if (!participant.active || this.isWinner(participant, participant.marathon.steps)) {
      throw new BadRequestException('Report time cannot be changed for this marathon');
    }

    const reportHour = this.applyReportTime(participant.reportHour, input.reportTime, participant);
    const updated = await this.prisma.marathonParticipant.update({
      where: { id: participant.id },
      data: { reportHour },
      include: {
        marathon: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        submissions: {
          include: {
            step: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        surveyResponse: true,
        penaltyReports: true,
      },
    });

    return this.mapToMyMarathon(updated);
  }

  async submitNps(
    userId: string,
    marathonerId: string,
    input: { score?: number; comment?: string },
  ): Promise<MyMarathonSurvey | null> {
    this.logger.debug(`My marathon NPS submit requested (userId=${userId}, marathonerId=${marathonerId})`);

    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        userId,
      },
      include: {
        surveyResponse: true,
      },
    });

    if (!participant) {
      return null;
    }

    if (!participant.finishedAt) {
      throw new BadRequestException('NPS survey is available after marathon completion');
    }

    const score = Number(input.score);
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      throw new BadRequestException('NPS score must be an integer from 0 to 10');
    }

    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    if (comment.length > 2000) {
      throw new BadRequestException('NPS comment is too long');
    }

    const response = await this.prisma.marathonSurveyResponse.upsert({
      where: { participantId: participant.id },
      create: {
        participantId: participant.id,
        score,
        comment: comment || null,
      },
      update: {
        score,
        comment: comment || null,
      },
    });

    return this.mapSurvey(response);
  }


  private normalizeEmail(value: unknown): string | null {
    const normalized = this.normalizeProfileText(value, 254, 'Email');
    if (!normalized) return null;
    const email = normalized.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email must be a valid email address');
    }
    return email;
  }

  private normalizeProfileText(value: unknown, maxLength: number, fieldName: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(`${fieldName} is too long`);
    }
    return normalized || null;
  }

  private normalizeAvatarUrl(value: unknown): string | null {
    const normalized = this.normalizeProfileText(value, 250000, 'Avatar image');
    if (!normalized) return null;
    if (normalized.startsWith('/')) return normalized;
    if (/^data:image\/(webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(normalized)) {
      return normalized;
    }
    try {
      const url = new URL(normalized);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString();
      }
    } catch {
      // Fall through to a user-facing validation error.
    }
    throw new BadRequestException('Avatar image must be a compressed image upload, an http(s) URL, or an internal path');
  }

  private getDeadlineReconciliationIntervalMs(): number {
    const rawValue = process.env.MARATHON_DEADLINE_RECONCILIATION_INTERVAL_MS;
    if (!rawValue) return DEFAULT_DEADLINE_RECONCILIATION_INTERVAL_MS;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return DEFAULT_DEADLINE_RECONCILIATION_INTERVAL_MS;
    return Math.max(0, Math.floor(parsed));
  }

  private async runDeadlineReconciliation(reason: 'startup' | 'interval'): Promise<void> {
    if (this.deadlineReconciliationRunning) {
      this.logger.debug(`Marathon deadline reconciliation skipped (${reason}): previous run still active`);
      return;
    }

    this.deadlineReconciliationRunning = true;
    try {
      const candidates = await this.findDeadlineReconciliationCandidates();
      if (!candidates.length) {
        this.logger.debug(`Marathon deadline reconciliation ${reason}: no due candidates`);
        return;
      }

      const participants = await this.prisma.marathonParticipant.findMany({
        where: {
          id: { in: candidates.map((candidate) => candidate.id) },
        },
        include: {
          marathon: {
            include: {
              steps: {
                orderBy: { sequence: 'asc' },
              },
            },
          },
          submissions: {
            include: {
              step: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          surveyResponse: true,
          penaltyReports: true,
        },
      });

      let processed = 0;
      for (const participant of participants) {
        await this.reconcileMissedDeadlines(participant);
        processed += 1;
      }

      this.logger.log(`Marathon deadline reconciliation ${reason}: processed ${processed} participant(s)`);
    } finally {
      this.deadlineReconciliationRunning = false;
    }
  }

  private async findDeadlineReconciliationCandidates(): Promise<DeadlineCandidate[]> {
    return this.prisma.$queryRaw<DeadlineCandidate[]>`
      SELECT DISTINCT p.id
      FROM "MarathonParticipant" p
      JOIN "MarathonStep" s ON s."marathonId" = p."marathonId"
      LEFT JOIN "StepSubmission" completed_submission
        ON completed_submission."participantId" = p.id
       AND completed_submission."stepId" = s.id
       AND completed_submission."isCompleted" = true
      WHERE p.active = true
        AND p."finishedAt" IS NULL
        AND completed_submission.id IS NULL
        AND p."reportHour" + make_interval(days => s.sequence) <= now()
        AND p."reportHour" + make_interval(days => s.sequence) > now() - make_interval(mins => ${DEADLINE_RECONCILIATION_LOOKBACK_MINUTES}::int)
      ORDER BY p.id
      LIMIT ${DEADLINE_RECONCILIATION_BATCH_SIZE}
    `;
  }

  private async reconcileMissedDeadlines(participant: any): Promise<any> {
    if (!participant.active || this.isWinner(participant, participant.marathon.steps)) {
      return participant;
    }

    const now = new Date();
    const completedStepIds = new Set(
      participant.submissions
        .filter((submission: any) => submission.isCompleted)
        .map((submission: any) => submission.stepId),
    );

    let changed = false;
    let canUsePenalty = participant.canUsePenalty;
    let bonusDaysLeft = participant.bonusDaysLeft;

    for (const step of participant.marathon.steps) {
      if (completedStepIds.has(step.id)) continue;
      const dueAt = this.resolveDueAt(participant.reportHour, step.sequence);
      if (dueAt > now) break;

      const alreadyReported = participant.penaltyReports.some((report: any) => {
        const value = report.value && typeof report.value === 'object' ? report.value : {};
        return value.stepId === step.id && (value.reason === 'missed_deadline' || value.reason === 'late_submission');
      });
      if (alreadyReported) continue;

      const penaltyValue = {
        stepId: step.id,
        reason: 'missed_deadline',
        dueAt: dueAt.toISOString(),
      };

      if (canUsePenalty) {
        await this.prisma.penaltyReport.create({
          data: {
            participantId: participant.id,
            completed: false,
            value: penaltyValue,
          },
        });
        await this.prisma.marathonParticipant.update({
          where: { id: participant.id },
          data: { canUsePenalty: false },
        });
        canUsePenalty = false;
      } else {
        bonusDaysLeft = Math.max(0, bonusDaysLeft - 1);
        await this.prisma.penaltyReport.create({
          data: {
            participantId: participant.id,
            completed: true,
            completeTime: now,
            value: penaltyValue,
          },
        });
        await this.prisma.marathonParticipant.update({
          where: { id: participant.id },
          data: { bonusDaysLeft },
        });
      }
      changed = true;
    }

    if (!changed) return participant;
    return this.prisma.marathonParticipant.findUnique({
      where: { id: participant.id },
      include: {
              marathon: {
                include: {
                  steps: {
                    orderBy: { sequence: 'asc' },
                  },
                },
              },
              submissions: {
                include: {
                  step: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              surveyResponse: true,
              penaltyReports: true,
            },
    });
  }

  private findNextUncompletedStep(participant: any): any | null {
    const completedStepIds = new Set(
      participant.submissions
        .filter((submission: any) => submission.isCompleted)
        .map((submission: any) => submission.stepId),
    );
    return participant.marathon.steps.find((step: any) => !completedStepIds.has(step.id)) || null;
  }

  private mapToMyMarathon(participant: any): MyMarathon {
    const marathon = participant.marathon;
    const steps = marathon.steps;
    const submissions = participant.submissions;

    const latestSubmission = submissions.length > 0 ? submissions[0] : null;
    const latestStep = latestSubmission ? latestSubmission.step : null;

    const paymentRequired = this.calculatePaymentRequired(participant, latestStep, marathon);
    const paymentStatus = this.getPaymentStatus(participant);
    const answers = this.buildSchedule(participant, steps, submissions, paymentRequired);
    const latestOpenSubmissionStep = latestSubmission && latestStep
      ? answers.find((answer) => answer.stepId === latestSubmission.stepId && answer.can_open && answer.state !== 'completed' && answer.state !== 'done')
      : null;
    const currentStep =
      latestOpenSubmissionStep ||
      answers.find((answer) => answer.can_open && answer.state === 'active') ||
      answers.find((answer) => answer.can_open && answer.state !== 'completed' && answer.state !== 'done') ||
      (latestSubmission && latestStep ? this.mapToAnswer(latestSubmission, latestStep, participant) : null);

    const canChangeReportTime = participant.active && !this.isWinner(participant, steps);

    return {
      title: marathon.title,
      languageCode: marathon.languageCode,
      payment_status: paymentStatus,
      payment_required: paymentRequired,
      registered: true,
      id: participant.id,
      bonus_total: BONUS_DAYS,
      bonus_left: participant.bonusDaysLeft,
      can_change_report_time: canChangeReportTime,
      report_time: participant.reportHour ? participant.reportHour.toISOString() : null,
      report_time_label: participant.reportHour ? this.formatReportTime(participant.reportHour) : null,
      current_step: currentStep,
      answers,
      finished_at: participant.finishedAt ? participant.finishedAt.toISOString() : null,
      medal: this.getParticipantMedal(participant, steps),
      nps_survey: participant.surveyResponse ? this.mapSurvey(participant.surveyResponse) : null,
      can_generate_progress_report: this.canGenerateProgressReport(participant),
    };
  }

  private mapSurvey(survey: any): MyMarathonSurvey {
    return {
      score: survey.score,
      comment: survey.comment,
      submitted_at: survey.updatedAt.toISOString(),
    };
  }

  private canGenerateProgressReport(participant: any): boolean {
    const marathon = participant.marathon;
    const paymentRequired = this.calculatePaymentRequired(participant, this.latestStep(participant.submissions), marathon);
    if (paymentRequired) return false;
    return participant.submissions.some((submission: any) => submission.isCompleted && submission.isChecked);
  }

  private mapToProgressReport(participant: any): MyMarathonProgressReport {
    const marathon = participant.marathon;
    const paymentRequired = this.calculatePaymentRequired(participant, this.latestStep(participant.submissions), marathon);
    const paymentStatus = this.getPaymentStatus(participant);
    const schedule = this.buildSchedule(participant, marathon.steps, participant.submissions, paymentRequired);
    const steps = this.mapProgressReportSteps(schedule, marathon.steps, participant.submissions);
    const totalSteps = steps.length;
    const completedSteps = steps.filter((step) => step.state === 'completed' || step.state === 'done').length;
    const checkedSteps = steps.filter((step) => step.state === 'checked').length;
    const activeSteps = steps.filter((step) => step.state === 'active').length;
    const lockedSteps = steps.filter((step) => step.state === 'inactive').length;
    const lateSteps = steps.filter((step) => step.isLate).length;
    const trialSteps = steps.filter((step) => step.isTrialStep).length;
    const currentStep = steps.find((step) => step.state === 'active') || null;

    return {
      generatedAt: new Date().toISOString(),
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        active: participant.active,
        registeredAt: participant.createdAt.toISOString(),
        finishedAt: participant.finishedAt ? participant.finishedAt.toISOString() : null,
      },
      marathon: {
        id: marathon.id,
        title: marathon.title,
        languageCode: marathon.languageCode,
        slug: marathon.slug,
      },
      access: {
        paymentStatus,
        paymentRequired,
        paid: participant.paid,
        bonusDaysLeft: participant.bonusDaysLeft,
        bonusDaysTotal: BONUS_DAYS,
      },
      summary: {
        totalSteps,
        completedSteps,
        checkedSteps,
        activeSteps,
        lockedSteps,
        lateSteps,
        trialSteps,
        gatedSteps: totalSteps - trialSteps,
        completionPercent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
        penaltyReports: participant.penaltyReports.length,
        paymentAttempts: participant.paymentAttempts.length,
      },
      currentStep,
      steps,
      paymentAttempts: participant.paymentAttempts.map((attempt: any) => ({
        orderId: attempt.orderId,
        status: attempt.status,
        amount: attempt.amount.toString(),
        currency: attempt.currency,
        paymentMethod: attempt.paymentMethod,
        createdAt: attempt.createdAt.toISOString(),
        confirmedAt: attempt.confirmedAt ? attempt.confirmedAt.toISOString() : null,
      })),
    };
  }

  private getPaymentStatus(participant: any): 'paid' | 'unpaid' {
    return participant.paid ? 'paid' : 'unpaid';
  }

  private mapToAnswer(submission: any, step: any, participant: any): Answer {
    return {
      id: submission.id,
      stepId: step.id,
      title: step.title,
      start: submission.startAt.toISOString(),
      stop: submission.endAt.toISOString(),
      state: submission.isCompleted && submission.isChecked ? 'checked' : submission.isCompleted ? 'completed' : 'active',
      is_late: step.isPenalized && submission.endAt > this.resolveDueAt(participant.reportHour, step.sequence),
      can_open: true,
      is_scheduled_future: false,
      block_reason: null,
    };
  }

  private buildSchedule(participant: any, steps: any[], submissions: any[], paymentRequired: boolean): Answer[] {
    const schedule: Answer[] = [];
    const submissionMap = new Map();
    for (const submission of submissions) {
      if (!submissionMap.has(submission.stepId)) {
        submissionMap.set(submission.stepId, submission);
      }
    }
    let previousStepsChecked = true;
    const now = new Date();

    for (const step of steps) {
      const startAt = this.resolveStartAt(participant.reportHour, step.sequence);
      const dueAt = this.resolveDueAt(participant.reportHour, step.sequence);
      const submission = submissionMap.get(step.id);
      const blockedByPayment = paymentRequired;
      const blockedByPreviousReport = !previousStepsChecked;

      if (submission) {
        const mapped = this.mapToAnswer(submission, step, participant);
        schedule.push({
          ...mapped,
          state: blockedByPayment || blockedByPreviousReport ? 'inactive' : mapped.state,
          can_open: !blockedByPayment && !blockedByPreviousReport,
          block_reason: blockedByPayment
            ? 'payment_required'
            : blockedByPreviousReport
              ? 'previous_report_pending'
              : null,
        });
        previousStepsChecked = submission.isCompleted && submission.isChecked;
      } else {
        const scheduledFuture = startAt > now;
        const canOpen = !blockedByPayment && !blockedByPreviousReport;
        const state = canOpen && !scheduledFuture ? 'active' : 'inactive';
        const blockReason = blockedByPayment
          ? 'payment_required'
          : blockedByPreviousReport
            ? 'previous_report_pending'
            : scheduledFuture
              ? 'scheduled_future'
              : null;

        schedule.push({
          id: 0,
          stepId: step.id,
          title: step.title,
          start: startAt.toISOString(),
          stop: dueAt.toISOString(),
          state,
          is_late: false,
          can_open: canOpen,
          is_scheduled_future: scheduledFuture,
          block_reason: blockReason,
        });

        previousStepsChecked = false;
      }
    }

    return schedule;
  }

  private mapProgressReportSteps(schedule: Answer[], steps: any[], submissions: any[]): ProgressReportStep[] {
    const stepById = new Map(steps.map((step) => [step.id, step]));
    const submissionByStepId = new Map();
    for (const submission of submissions) {
      if (!submissionByStepId.has(submission.stepId)) {
        submissionByStepId.set(submission.stepId, submission);
      }
    }

    return schedule.map((answer) => {
      const step = stepById.get(answer.stepId);
      const submission = submissionByStepId.get(answer.stepId);
      return {
        stepId: answer.stepId,
        sequence: step?.sequence ?? 0,
        title: answer.title,
        state: answer.state,
        isTrialStep: Boolean(step?.isTrialStep),
        isLate: answer.is_late,
        start: answer.start,
        stop: answer.stop,
        submittedAt: submission ? submission.updatedAt.toISOString() : null,
        rating: submission ? submission.rating : null,
        blockReason: answer.block_reason ?? null,
      };
    });
  }

  private latestStep(submissions: any[]): any | null {
    const latestSubmission = submissions.length > 0 ? submissions[0] : null;
    return latestSubmission ? latestSubmission.step : null;
  }

  private isWinner(participant: any, steps: any[]): boolean {
    const completedCount = participant.submissions.filter((s: any) => s.isCompleted && s.isChecked).length;
    return completedCount === steps.length;
  }

  private getParticipantMedal(participant: any, steps: any[]): MarathonMedal | null {
    if (!this.hasCompletedAllSteps(participant, steps)) {
      return null;
    }
    if (participant.canUsePenalty && participant.bonusDaysLeft >= 7) {
      return 'gold';
    }
    if (participant.bonusDaysLeft >= 7) {
      const penaltyReports = participant.penaltyReports || [];
      const hasIncompletePenalty = penaltyReports.some((report: any) => !report.completed);
      if (!hasIncompletePenalty) {
        return 'silver';
      }
    }
    return 'bronze';
  }

  private hasCompletedAllSteps(participant: any, steps: any[]): boolean {
    const stepIds = new Set(steps.map((step: any) => step.id));
    const completedStepIds = new Set(
      participant.submissions
        .filter((submission: any) => submission.isCompleted)
        .map((submission: any) => submission.stepId),
    );
    return stepIds.size > 0 && Array.from(stepIds).every((stepId) => completedStepIds.has(stepId));
  }

  private resolveStartAt(reportHour: Date, sequence: number): Date {
    const startAt = new Date(reportHour);
    startAt.setDate(startAt.getDate() + Math.max(sequence - 1, 0));
    return startAt;
  }

  private resolveDueAt(reportHour: Date, sequence: number): Date {
    const dueAt = this.resolveStartAt(reportHour, sequence);
    dueAt.setDate(dueAt.getDate() + 1);
    return dueAt;
  }

  private calculatePaymentRequired(participant: any, step: any, marathon: any): boolean {
    return !participant.paid;
  }

  private applyReportTime(currentReportHour: Date, value: unknown, participant?: any): Date {
    if (typeof value !== 'string') {
      throw new BadRequestException('reportTime must use HH:mm format');
    }

    const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      throw new BadRequestException('reportTime must use HH:mm format');
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!participant) {
      const next = new Date(currentReportHour);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }

    const nextStep = this.findNextUncompletedStep(participant);
    if (!nextStep) {
      const next = new Date(currentReportHour);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }

    const now = new Date();
    const minStartAt = new Date(now.getTime() + MIN_NEXT_STEP_WINDOW_MS);
    const nextStartAt = new Date(now);
    nextStartAt.setHours(hours, minutes, 0, 0);
    if (nextStartAt <= now) {
      nextStartAt.setDate(nextStartAt.getDate() + 1);
    }
    while (nextStartAt < minStartAt) {
      nextStartAt.setDate(nextStartAt.getDate() + 1);
    }

    const reportHour = new Date(nextStartAt);
    reportHour.setDate(reportHour.getDate() - Math.max(nextStep.sequence - 1, 0));
    return reportHour;
  }

  private formatReportTime(value: Date): string {
    return value.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
