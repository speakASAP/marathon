import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type Answer = {
  id: string | number;
  stepId: string;
  title: string;
  start: string;
  stop: string;
  state: string;
  is_late: boolean;
  block_reason?: string | null;
};

export type MyMarathon = {
  title: string;
  type: 'trial' | 'free' | 'vip';
  needs_payment: boolean;
  registered: boolean;
  id: string;
  bonus_total: number;
  bonus_left: number;
  can_change_report_time: boolean;
  report_time: string | null;
  current_step: Answer | null;
  answers: Answer[];
  finished_at: string | null;
  nps_survey: MyMarathonSurvey | null;
};

export type MyMarathonSurvey = {
  score: number;
  comment: string | null;
  submitted_at: string;
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
    type: 'trial' | 'free' | 'vip';
    needsPayment: boolean;
    vipRequired: boolean;
    paymentReported: boolean;
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

@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listMarathons(userId: string): Promise<MyMarathon[]> {
    this.logger.debug(`My marathons list requested (userId=${userId})`);

    const participants = await this.prisma.marathonParticipant.findMany({
      where: { userId },
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
      },
    });

    return participants.map((participant) => this.mapToMyMarathon(participant));
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
        },
      });
    }

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

    return this.mapToProgressReport(participant);
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

  private mapToMyMarathon(participant: any): MyMarathon {
    const marathon = participant.marathon;
    const steps = marathon.steps;
    const submissions = participant.submissions;

    const latestSubmission = submissions.length > 0 ? submissions[0] : null;
    const latestStep = latestSubmission ? latestSubmission.step : null;

    const needsPayment = this.calculateNeedsPayment(participant, latestStep, marathon);
    const type = this.getMarathonType(participant);
    const answers = this.buildSchedule(participant, steps, submissions, needsPayment);
    const currentStep =
      answers.find((answer) => answer.state === 'active') ||
      (latestSubmission ? this.mapToAnswer(latestSubmission, latestStep) : null);

    const canChangeReportTime =
      participant.active &&
      !this.isWinner(participant, steps) &&
      (!latestStep || !latestStep.isPenalized);

    return {
      title: marathon.title,
      type,
      needs_payment: needsPayment,
      registered: true,
      id: participant.id,
      bonus_total: BONUS_DAYS,
      bonus_left: participant.bonusDaysLeft,
      can_change_report_time: canChangeReportTime,
      report_time: latestSubmission ? latestSubmission.endAt.toISOString() : null,
      current_step: currentStep,
      answers,
      finished_at: participant.finishedAt ? participant.finishedAt.toISOString() : null,
      nps_survey: participant.surveyResponse ? this.mapSurvey(participant.surveyResponse) : null,
    };
  }

  private mapSurvey(survey: any): MyMarathonSurvey {
    return {
      score: survey.score,
      comment: survey.comment,
      submitted_at: survey.updatedAt.toISOString(),
    };
  }

  private mapToProgressReport(participant: any): MyMarathonProgressReport {
    const marathon = participant.marathon;
    const needsPayment = this.calculateNeedsPayment(participant, this.latestStep(participant.submissions), marathon);
    const type = this.getMarathonType(participant);
    const schedule = this.buildSchedule(participant, marathon.steps, participant.submissions, needsPayment);
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
        type,
        needsPayment,
        vipRequired: participant.vipRequired,
        paymentReported: participant.paymentReported,
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

  private getMarathonType(participant: any): 'trial' | 'free' | 'vip' {
    if (participant.vipRequired && participant.isFree) {
      return 'trial';
    }
    if (participant.isFree) {
      return 'free';
    }
    return 'vip';
  }

  private mapToAnswer(submission: any, step: any): Answer {
    return {
      id: submission.id,
      stepId: step.id,
      title: step.title,
      start: submission.startAt.toISOString(),
      stop: submission.endAt.toISOString(),
      state: submission.isCompleted ? 'completed' : submission.isChecked ? 'checked' : 'active',
      is_late: submission.endAt < new Date() && !submission.isCompleted,
      block_reason: null,
    };
  }

  private buildSchedule(participant: any, steps: any[], submissions: any[], needsPayment: boolean): Answer[] {
    const schedule: Answer[] = [];
    const submissionMap = new Map();
    for (const submission of submissions) {
      if (!submissionMap.has(submission.stepId)) {
        submissionMap.set(submission.stepId, submission);
      }
    }
    let hasOpenStep = false;

    for (const step of steps) {
      const submission = submissionMap.get(step.id);
      if (submission) {
        const mapped = this.mapToAnswer(submission, step);
        if (mapped.state === 'active') {
          hasOpenStep = true;
        }
        schedule.push(mapped);
      } else {
        const prevStop = schedule.length > 0 ? new Date(schedule[schedule.length - 1].stop) : new Date();
        const nextStop = new Date(prevStop);
        nextStop.setDate(nextStop.getDate() + 1);
        const blockedByPayment = needsPayment && !step.isTrialStep;
        const state = !hasOpenStep && !blockedByPayment ? 'active' : 'inactive';
        if (state === 'active') {
          hasOpenStep = true;
        }

        schedule.push({
          id: 0,
          stepId: step.id,
          title: step.title,
          start: prevStop.toISOString(),
          stop: nextStop.toISOString(),
          state,
          is_late: false,
          block_reason: blockedByPayment ? 'payment_required' : null,
        });
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

  private calculateNeedsPayment(participant: any, step: any, marathon: any): boolean {
    if (!participant.vipRequired || !participant.isFree) {
      return false;
    }
    if (!marathon.vipGateDate) {
      return false;
    }
    return new Date() >= marathon.vipGateDate;
  }
}
