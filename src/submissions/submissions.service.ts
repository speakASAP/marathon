import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WinnersService } from '../winners/winners.service';

export type SubmissionRequest = {
  stepId?: string;
  report?: string;
  payload?: Record<string, unknown>;
  rating?: number;
  completed?: boolean;
};

export type SubmissionResponse = {
  id: string;
  marathonerId: string;
  stepId: string;
  state: 'completed' | 'active';
  is_late: boolean;
  bonus_left: number;
  penalty_reported: boolean;
  updated_at: string;
};

export type SubmissionDetailResponse = {
  exists: boolean;
  id?: string;
  marathonerId: string;
  stepId: string;
  report: string;
  payload: Record<string, unknown>;
  state: 'completed' | 'active';
  is_late: boolean;
  bonus_left: number;
  updated_at?: string;
};

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly winnersService: WinnersService,
  ) {}

  async submit(userId: string, marathonerId: string, payload: SubmissionRequest): Promise<SubmissionResponse> {
    const normalizedStepId = payload.stepId?.trim();
    if (!normalizedStepId) {
      throw new BadRequestException('stepId is required');
    }

    const report = payload.report?.trim();
    const extraPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
    if (!report && Object.keys(extraPayload).length === 0) {
      throw new BadRequestException('report or payload is required');
    }

    const participant = await this.findAndClaimParticipant(userId, marathonerId);
    if (!participant.active) {
      throw new ConflictException('Participant is not active');
    }

    const step = await this.prisma.marathonStep.findFirst({
      where: {
        id: normalizedStepId,
        marathonId: participant.marathonId,
      },
    });
    if (!step) {
      throw new NotFoundException('Step not found for this marathon');
    }

    if (!step.assignmentContent?.trim()) {
      throw new ConflictException('Assignment content is not configured for this step');
    }

    if (this.isPaymentRequired(participant)) {
      throw new ForbiddenException('Marathon payment is required before submitting this step');
    }

    const completed = payload.completed !== false;
    const now = new Date();
    const existing = await this.prisma.stepSubmission.findFirst({
      where: {
        participantId: participant.id,
        stepId: step.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    const startAt = existing?.startAt || this.resolveStartAt(participant.reportHour, step.sequence);
    const endAt = now;
    const isLate = step.isPenalized && endAt > this.resolveDueAt(participant.reportHour, step.sequence);
    const payloadJson = {
      ...(existing?.payloadJson && typeof existing.payloadJson === 'object' ? existing.payloadJson as Record<string, unknown> : {}),
      ...extraPayload,
      ...(report ? { report } : {}),
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = existing
        ? await tx.stepSubmission.update({
            where: { id: existing.id },
            data: {
              endAt,
              isCompleted: completed,
              rating: this.normalizeRating(payload.rating, existing.rating),
              payloadJson,
            },
          })
        : await tx.stepSubmission.create({
            data: {
              participantId: participant.id,
              stepId: step.id,
              startAt,
              endAt,
              isCompleted: completed,
              isChecked: false,
              rating: this.normalizeRating(payload.rating),
              payloadJson,
            },
          });

      let penaltyReported = false;
      let bonusDaysLeft = participant.bonusDaysLeft;
      if (completed && isLate) {
        const existingPenalty = await tx.penaltyReport.findFirst({
          where: {
            participantId: participant.id,
            value: {
              path: ['submissionId'],
              equals: submission.id,
            },
          },
        });

        if (!existingPenalty) {
          await tx.penaltyReport.create({
            data: {
              participantId: participant.id,
              completed: true,
              completeTime: endAt,
              value: {
                stepId: step.id,
                submissionId: submission.id,
                reason: 'late_submission',
              },
            },
          });
          penaltyReported = true;
          bonusDaysLeft = Math.max(0, participant.bonusDaysLeft - 1);
          await tx.marathonParticipant.update({
            where: { id: participant.id },
            data: { bonusDaysLeft },
          });
        }
      }

      return { submission, bonusDaysLeft, penaltyReported };
    });

    this.logger.log(
      `Step submission saved: participantId=${participant.id}, stepId=${step.id}, submissionId=${result.submission.id}, completed=${completed}, late=${isLate}`,
    );

    if (completed) {
      try {
        const reconciliation = await this.winnersService.reconcileParticipantCompletion(participant.id, userId);
        if (reconciliation.completed) {
          this.logger.log(
            `Winner reconciliation after submission: participantId=${participant.id}, winnerId=${reconciliation.winnerId || 'none'}, medal=${reconciliation.medal || 'none'}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Winner reconciliation failed after submission: participantId=${participant.id}, stepId=${step.id}, error=${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      id: result.submission.id,
      marathonerId: participant.id,
      stepId: step.id,
      state: result.submission.isCompleted ? 'completed' : 'active',
      is_late: isLate,
      bonus_left: result.bonusDaysLeft,
      penalty_reported: result.penaltyReported,
      updated_at: result.submission.updatedAt.toISOString(),
    };
  }

  async getForStep(userId: string, marathonerId: string, stepId: string): Promise<SubmissionDetailResponse> {
    const normalizedStepId = stepId.trim();
    if (!normalizedStepId) {
      throw new BadRequestException('stepId is required');
    }

    const participant = await this.findAndClaimParticipant(userId, marathonerId);
    const step = await this.prisma.marathonStep.findFirst({
      where: {
        id: normalizedStepId,
        marathonId: participant.marathonId,
      },
    });
    if (!step) {
      throw new NotFoundException('Step not found for this marathon');
    }

    const submission = await this.prisma.stepSubmission.findFirst({
      where: {
        participantId: participant.id,
        stepId: step.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!submission) {
      return {
        exists: false,
        marathonerId: participant.id,
        stepId: step.id,
        report: '',
        payload: {},
        state: 'active',
        is_late: false,
        bonus_left: participant.bonusDaysLeft,
      };
    }

    const payloadJson = this.normalizePayloadJson(submission.payloadJson);
    const report = typeof payloadJson.report === 'string' ? payloadJson.report : '';

    return {
      exists: true,
      id: submission.id,
      marathonerId: participant.id,
      stepId: step.id,
      report,
      payload: payloadJson,
      state: submission.isCompleted ? 'completed' : 'active',
      is_late: step.isPenalized && submission.endAt > this.resolveDueAt(participant.reportHour, step.sequence),
      bonus_left: participant.bonusDaysLeft,
      updated_at: submission.updatedAt.toISOString(),
    };
  }

  private async findAndClaimParticipant(userId: string, marathonerId: string) {
    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        OR: [{ userId }, { userId: null }],
      },
      include: {
        marathon: { include: { product: true } },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    if (participant.userId && participant.userId !== userId) {
      throw new ForbiddenException('Participant belongs to another user');
    }
    if (!participant.userId) {
      return this.prisma.marathonParticipant.update({
        where: { id: participant.id },
        data: { userId },
        include: { marathon: { include: { product: true } } },
      });
    }
    return participant;
  }

  private normalizeRating(value?: number, fallback = 0): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(5, Math.round(value)));
  }

  private normalizePayloadJson(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
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

  private isPaymentRequired(participant: any): boolean {
    return !participant.paid;
  }
}
