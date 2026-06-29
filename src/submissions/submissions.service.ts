import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AssignmentBlock, AssignmentKnownWordsBlock, normalizeAssignmentBlocks } from '../steps/assignment-blocks';
import { missingRequiredAssignmentAnswers } from '../steps/assignment-contract';
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

    this.assertStepAccessAllowed(participant, step);

    const completed = payload.completed !== false;
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockParticipantStep(tx, participant.id, step.id);

      const existingSubmissions = await this.findSubmissionsForParticipantStep(tx, participant.id, step.id);
      const completedSubmission = existingSubmissions.find((submission: any) => submission.isCompleted);
      if (completedSubmission) {
        throw new ConflictException('Этот отчет уже отправлен и больше не редактируется');
      }

      const existing = this.pickEditableSubmission(existingSubmissions);
      const startAt = existing?.startAt || this.resolveStartAt(participant.reportHour, step.sequence);
      const endAt = now;
      const isLate = endAt > this.resolveDueAt(participant.reportHour, step.sequence);
      const payloadJson = {
        ...(existing?.payloadJson && typeof existing.payloadJson === 'object' ? existing.payloadJson as Record<string, unknown> : {}),
        ...extraPayload,
        ...(report ? { report } : {}),
      };

      if (completed) {
        this.assertRequiredAnswers(normalizeAssignmentBlocks(step.assignmentBlocks), payloadJson);
      }

      const submission = existing
        ? await tx.stepSubmission.update({
            where: { id: existing.id },
            data: {
              endAt,
              isCompleted: completed,
              isChecked: completed ? false : existing.isChecked,
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

      await this.deleteSiblingDrafts(tx, participant.id, step.id, submission.id);

      let penaltyReported = false;
      let bonusDaysLeft = participant.bonusDaysLeft;
      if (completed && isLate) {
        const existingPenalty = await tx.penaltyReport.findFirst({
          where: {
            participantId: participant.id,
            value: {
              path: ['stepId'],
              equals: step.id,
            },
          },
        });

        if (!existingPenalty) {
          const penaltyValue = {
            stepId: step.id,
            submissionId: submission.id,
            reason: 'late_submission',
            dueAt: this.resolveDueAt(participant.reportHour, step.sequence).toISOString(),
          };
          if (participant.canUsePenalty) {
            await tx.penaltyReport.create({
              data: {
                participantId: participant.id,
                completed: false,
                value: penaltyValue,
              },
            });
            await tx.marathonParticipant.update({
              where: { id: participant.id },
              data: { canUsePenalty: false },
            });
          } else {
            await tx.penaltyReport.create({
              data: {
                participantId: participant.id,
                completed: true,
                completeTime: endAt,
                value: penaltyValue,
              },
            });
            bonusDaysLeft = Math.max(0, participant.bonusDaysLeft - 1);
            await tx.marathonParticipant.update({
              where: { id: participant.id },
              data: { bonusDaysLeft },
            });
          }
          penaltyReported = true;
        }
      }

      return { submission, bonusDaysLeft, penaltyReported, isLate };
    });

    this.logger.log(
      `Step submission saved: participantId=${participant.id}, stepId=${step.id}, submissionId=${result.submission.id}, completed=${completed}, late=${result.isLate}`,
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
      is_late: result.isLate,
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

    this.assertStepAccessAllowed(participant, step);

    const submissions = await this.findSubmissionsForParticipantStep(this.prisma, participant.id, step.id);
    const submission = submissions.find((candidate: any) => candidate.isCompleted) || this.pickEditableSubmission(submissions);

    if (!submission) {
      return {
        exists: false,
        marathonerId: participant.id,
        stepId: step.id,
        report: '',
        payload: await this.hydrateKnownWordsPayload(
          participant.id,
          step.marathonId,
          normalizeAssignmentBlocks(step.assignmentBlocks),
          {},
        ),
        state: 'active',
        is_late: false,
        bonus_left: participant.bonusDaysLeft,
      };
    }

    const payloadJson = await this.hydrateKnownWordsPayload(
      participant.id,
      step.marathonId,
      normalizeAssignmentBlocks(step.assignmentBlocks),
      this.normalizePayloadJson(submission.payloadJson),
    );
    const report = typeof payloadJson.report === 'string' ? payloadJson.report : '';

    return {
      exists: true,
      id: submission.id,
      marathonerId: participant.id,
      stepId: step.id,
      report,
      payload: payloadJson,
      state: submission.isCompleted ? 'completed' : 'active',
      is_late: submission.endAt > this.resolveDueAt(participant.reportHour, step.sequence),
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
        marathon: {
          include: {
            product: true,
            steps: { orderBy: { sequence: 'asc' } },
          },
        },
        submissions: true,
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
        include: {
          marathon: {
            include: {
              product: true,
              steps: { orderBy: { sequence: 'asc' } },
            },
          },
          submissions: true,
        },
      });
    }
    return participant;
  }

  private assertRequiredAnswers(blocks: AssignmentBlock[], payload: Record<string, unknown>) {
    const missing = missingRequiredAssignmentAnswers(blocks, payload);

    if (missing.length) {
      throw new BadRequestException('Заполните обязательные ответы: ' + missing.map((block) => block.label).join(', '));
    }
  }

  private assertStepAccessAllowed(participant: any, step: any) {
    if (step.sequence <= 1) return;

    const submissions = participant.submissions || [];
    const alreadyOpened = submissions.some((submission: any) => submission.stepId === step.id);
    if (alreadyOpened) return;

    const completedStepIds = new Set(
      submissions
        .filter((submission: any) => submission.isCompleted)
        .map((submission: any) => submission.stepId),
    );
    const previousSteps = (participant.marathon?.steps || [])
      .filter((candidate: any) => candidate.sequence < step.sequence);

    if (previousSteps.every((candidate: any) => completedStepIds.has(candidate.id))) {
      return;
    }

    throw new ConflictException('Этот этап откроется после отправки отчета по предыдущему этапу');
  }

  private normalizeRating(value?: number, fallback = 0): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(5, Math.round(value)));
  }

  private knownWordsBlocks(blocks: AssignmentBlock[]): AssignmentKnownWordsBlock[] {
    return blocks.filter((block): block is AssignmentKnownWordsBlock => block.type === 'knownWords');
  }

  private async hydrateKnownWordsPayload(
    participantId: string,
    marathonId: string,
    blocks: AssignmentBlock[],
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knownWordsBlocks = this.knownWordsBlocks(blocks).filter((block) => (
      block.sourceForm && block.sourceName && payload[block.name] == null
    ));
    if (!knownWordsBlocks.length) return payload;

    const sourceForms = Array.from(new Set(knownWordsBlocks.map((block) => block.sourceForm!)));
    const sourceSteps = await this.prisma.marathonStep.findMany({
      where: { marathonId, formKey: { in: sourceForms } },
      select: { id: true, formKey: true },
    });
    const sourceStepIdByForm = new Map(sourceSteps.map((step) => [step.formKey, step.id]));
    const sourceStepIds = sourceSteps.map((step) => step.id);
    if (!sourceStepIds.length) return payload;

    const submissions = await this.prisma.stepSubmission.findMany({
      where: {
        participantId,
        stepId: { in: sourceStepIds },
        isCompleted: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const payloadByStepId = new Map<string, Record<string, unknown>>();
    for (const submission of submissions) {
      if (payloadByStepId.has(submission.stepId)) continue;
      payloadByStepId.set(submission.stepId, this.normalizePayloadJson(submission.payloadJson));
    }

    const hydrated = { ...payload };
    for (const block of knownWordsBlocks) {
      const sourceStepId = sourceStepIdByForm.get(block.sourceForm!);
      const sourcePayload = sourceStepId ? payloadByStepId.get(sourceStepId) : null;
      const sourceValue = sourcePayload ? sourcePayload[block.sourceName!] : null;
      if (Array.isArray(sourceValue) || typeof sourceValue === 'string') {
        hydrated[block.name] = sourceValue;
      }
    }
    return hydrated;
  }

  private normalizePayloadJson(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private async lockParticipantStep(tx: any, participantId: string, stepId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${participantId}), hashtext(${stepId}))`;
  }

  private async findSubmissionsForParticipantStep(tx: any, participantId: string, stepId: string): Promise<any[]> {
    return tx.stepSubmission.findMany({
      where: { participantId, stepId },
      orderBy: [
        { isCompleted: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private pickEditableSubmission(submissions: any[]): any | null {
    return submissions.find((submission) => !submission.isCompleted) || null;
  }

  private async deleteSiblingDrafts(tx: any, participantId: string, stepId: string, keepSubmissionId: string) {
    await tx.stepSubmission.deleteMany({
      where: {
        participantId,
        stepId,
        isCompleted: false,
        id: { not: keepSubmissionId },
      },
    });
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
