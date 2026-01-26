import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type Answer = {
  id: string | number;
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
      },
    });

    return participants.map((participant) => this.mapToMyMarathon(participant));
  }

  async getMarathonById(userId: string, marathonerId: string): Promise<MyMarathon | null> {
    this.logger.debug(`My marathon requested (userId=${userId}, marathonerId=${marathonerId})`);

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
      },
    });

    if (!participant) {
      return null;
    }

    return this.mapToMyMarathon(participant);
  }

  private mapToMyMarathon(participant: any): MyMarathon {
    const marathon = participant.marathon;
    const steps = marathon.steps;
    const submissions = participant.submissions;

    const latestSubmission = submissions.length > 0 ? submissions[0] : null;
    const latestStep = latestSubmission ? latestSubmission.step : null;

    const type = this.getMarathonType(participant);
    const currentStep = latestSubmission ? this.mapToAnswer(latestSubmission, latestStep) : null;
    const answers = this.buildSchedule(participant, steps, submissions);

    const canChangeReportTime =
      participant.active &&
      !this.isWinner(participant, steps) &&
      (!latestStep || !latestStep.isPenalized);

    const needsPayment = latestSubmission
      ? this.calculateNeedsPayment(participant, latestStep, marathon)
      : false;

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
      title: step.title,
      start: submission.startAt.toISOString(),
      stop: submission.endAt.toISOString(),
      state: submission.isCompleted ? 'completed' : submission.isChecked ? 'checked' : 'active',
      is_late: submission.endAt < new Date() && !submission.isCompleted,
      block_reason: null,
    };
  }

  private buildSchedule(participant: any, steps: any[], submissions: any[]): Answer[] {
    const schedule: Answer[] = [];
    const submissionMap = new Map(submissions.map((s) => [s.stepId, s]));

    for (const step of steps) {
      const submission = submissionMap.get(step.id);
      if (submission) {
        schedule.push(this.mapToAnswer(submission, step));
      } else {
        const prevStop = schedule.length > 0 ? new Date(schedule[schedule.length - 1].stop) : new Date();
        const nextStop = new Date(prevStop);
        nextStop.setDate(nextStop.getDate() + 1);

        schedule.push({
          id: 0,
          title: step.title,
          start: prevStop.toISOString(),
          stop: nextStop.toISOString(),
          state: 'inactive',
          is_late: false,
          block_reason: null,
        });
      }
    }

    return schedule;
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
