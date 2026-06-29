import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { normalizeAssignmentBlocks } from '../steps/assignment-blocks';
import {
  filterAssignmentPayloadForPublicReport,
  generateAssignmentReport,
} from '../steps/assignment-contract';

export type RandomAnswer = {
  marathoner: {
    id: string;
    name: string;
    avatar: string;
  };
  report: string;
  payload: Record<string, unknown>;
  complete_time: string;
};

export type PublicParticipantReports = {
  participant: {
    id: string;
    name: string;
    avatar: string;
  };
  marathon: {
    id: string;
    title: string;
    languageCode: string;
  };
  throughStep: {
    id: string;
    title: string;
    sequence: number;
  };
  reports: Array<{
    id: string;
    stepId: string;
    title: string;
    sequence: number;
    report: string;
    payload: Record<string, unknown>;
    complete_time: string;
  }>;
};

@Injectable()
export class AnswersService {
  private readonly logger = new Logger(AnswersService.name);
  private readonly maxRandomCandidateAttempts = 12;

  constructor(private readonly prisma: PrismaService) {}

  async getRandom(stepId: string, excludeMarathonerId?: string): Promise<RandomAnswer | null> {
    this.logger.log(`Random answer service called: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);

    const where: any = {
      stepId,
      isCompleted: true,
    };

    if (excludeMarathonerId) {
      where.participantId = { not: excludeMarathonerId };
      this.logger.debug(`Excluding marathoner from results: excludeMarathonerId=${excludeMarathonerId}`);
    }

    this.logger.debug(`Database count filters: ${JSON.stringify(where)}`);
    const countStartTime = Date.now();
    const completedSubmissions = await this.prisma.stepSubmission.count({ where });
    const countLatency = Date.now() - countStartTime;

    this.logger.log(
      `Random answer database count completed: found=${completedSubmissions}, latency=${countLatency}ms`,
    );

    if (!completedSubmissions) {
      this.logger.warn(`No completed submissions found: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);
      return null;
    }

    let candidate: {
      submission: NonNullable<Awaited<ReturnType<AnswersService['fetchRandomSubmissionCandidate']>>>;
      payload: Record<string, unknown> | null;
      assignmentBlocks: ReturnType<typeof normalizeAssignmentBlocks>;
      report: string;
      randomIndex: number;
    } | null = null;

    const usedIndexes = new Set<number>();
    const fetchStartTime = Date.now();
    const maxAttempts = Math.min(completedSubmissions, this.maxRandomCandidateAttempts);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let randomIndex = Math.floor(Math.random() * completedSubmissions);
      while (usedIndexes.has(randomIndex) && usedIndexes.size < completedSubmissions) {
        randomIndex = (randomIndex + 1) % completedSubmissions;
      }
      usedIndexes.add(randomIndex);

      const submission = await this.fetchRandomSubmissionCandidate(where, randomIndex);
      if (!submission) continue;

      const payload = submission.payloadJson as Record<string, unknown> | null;
      const assignmentBlocks = normalizeAssignmentBlocks(submission.step.assignmentBlocks);
      const report = generateAssignmentReport(payload, assignmentBlocks);
      if (!report.trim()) continue;

      candidate = {
        submission,
        payload,
        assignmentBlocks,
        report,
        randomIndex,
      };
      break;
    }

    const fetchLatency = Date.now() - fetchStartTime;
    if (!candidate) {
      this.logger.warn(
        `No public report text found after bounded random sampling: stepId=${stepId}, completedSubmissions=${completedSubmissions}, attempts=${maxAttempts}, excludeMarathonerId=${excludeMarathonerId || 'none'}`,
      );
      return null;
    }

    const submission = candidate.submission;

    this.logger.debug(
      `Selected random submission: index=${candidate.randomIndex} of ${completedSubmissions}, submissionId=${submission.id}, latency=${fetchLatency}ms`,
    );

    const participant = submission.participant;
    const step = submission.step;

    this.logger.debug(
      `Processing submission: participantId=${participant.id}, stepId=${step.id}`,
    );

    const name = participant.name?.trim() || 'Участник марафона';
    this.logger.debug(`Marathoner name resolved: name=${name}`);

    const reportStartTime = Date.now();
    const report = candidate.report;
    const reportLatency = Date.now() - reportStartTime;

    this.logger.log(
      `Random answer generated: stepId=${stepId}, completedSubmissions=${completedSubmissions}, attempts=${usedIndexes.size}, marathonerName=${name}, reportLength=${report.length}, latency=${reportLatency}ms`,
    );

    return {
      marathoner: {
        id: participant.id,
        name,
        avatar: await this.resolveParticipantAvatar(participant),
      },
      report,
      payload: filterAssignmentPayloadForPublicReport(candidate.payload, candidate.assignmentBlocks),
      complete_time: submission.endAt.toISOString(),
    };
  }

  async getParticipantReports(participantId: string, throughStepId: string): Promise<PublicParticipantReports | null> {
    const throughStep = await this.prisma.marathonStep.findUnique({
      where: { id: throughStepId },
      include: { marathon: true },
    });
    if (!throughStep) return null;

    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: participantId,
        marathonId: throughStep.marathonId,
      },
    });
    if (!participant) return null;

    const submissions = await this.prisma.stepSubmission.findMany({
      where: {
        participantId,
        isCompleted: true,
        step: {
          marathonId: throughStep.marathonId,
          sequence: { lte: throughStep.sequence },
        },
      },
      include: { step: true },
      orderBy: [{ step: { sequence: 'asc' } }, { updatedAt: 'desc' }],
    });

    const seenStepIds = new Set<string>();
    const reports: PublicParticipantReports['reports'] = [];
    for (const submission of submissions) {
      if (seenStepIds.has(submission.stepId)) continue;
      const assignmentBlocks = normalizeAssignmentBlocks(submission.step.assignmentBlocks);
      const payload = submission.payloadJson as Record<string, unknown> | null;
      const report = generateAssignmentReport(payload, assignmentBlocks).trim();
      if (!report) continue;
      seenStepIds.add(submission.stepId);
      reports.push({
        id: submission.id,
        stepId: submission.stepId,
        title: submission.step.title,
        sequence: submission.step.sequence,
        report,
        payload: filterAssignmentPayloadForPublicReport(payload, assignmentBlocks),
        complete_time: submission.endAt.toISOString(),
      });
    }

    const name = participant.name?.trim() || 'Участник марафона';
    this.logger.log(
      `Participant reports generated: participantId=${participantId}, throughStepId=${throughStepId}, reports=${reports.length}`,
    );

    return {
      participant: {
        id: participant.id,
        name,
        avatar: await this.resolveParticipantAvatar(participant),
      },
      marathon: {
        id: throughStep.marathon.id,
        title: throughStep.marathon.title,
        languageCode: throughStep.marathon.languageCode,
      },
      throughStep: {
        id: throughStep.id,
        title: throughStep.title,
        sequence: throughStep.sequence,
      },
      reports,
    };
  }

  private async resolveParticipantAvatar(participant: { userId: string | null }): Promise<string> {
    if (!participant.userId) return '';
    const profile = await this.prisma.marathonUserProfile.findUnique({
      where: { userId: participant.userId },
      select: { avatarUrl: true },
    });
    return profile?.avatarUrl?.trim() || '';
  }

  private async fetchRandomSubmissionCandidate(where: any, randomIndex: number) {
    return this.prisma.stepSubmission.findFirst({
      where,
      orderBy: { id: 'asc' },
      skip: randomIndex,
      include: {
        participant: true,
        step: true,
      },
    });
  }
}
