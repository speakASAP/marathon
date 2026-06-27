import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { normalizeAssignmentBlocks } from '../steps/assignment-blocks';
import {
  filterAssignmentPayloadForPublicReport,
  generateAssignmentReport,
} from '../steps/assignment-contract';

export type RandomAnswer = {
  marathoner: {
    name: string;
  };
  report: string;
  payload: Record<string, unknown>;
  complete_time: string;
};

@Injectable()
export class AnswersService {
  private readonly logger = new Logger(AnswersService.name);

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
    const fetchStartTime = Date.now();
    const submissions = await this.prisma.stepSubmission.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        participant: {
          include: {
            marathon: true,
          },
        },
        step: {
          include: {
            marathon: true,
          },
        },
      },
    });
    const fetchLatency = Date.now() - fetchStartTime;

    this.logger.log(
      `Random answer database fetch completed: found=${submissions.length}, latency=${fetchLatency}ms`,
    );

    if (!submissions.length) {
      this.logger.warn(`No completed submissions found: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);
      return null;
    }

    const candidates = submissions
      .map((submission) => {
        const payload = submission.payloadJson as Record<string, unknown> | null;
        const assignmentBlocks = normalizeAssignmentBlocks(submission.step.assignmentBlocks);
        const report = generateAssignmentReport(payload, assignmentBlocks);
        return {
          submission,
          payload,
          assignmentBlocks,
          report,
        };
      })
      .filter((candidate) => candidate.report.trim());

    if (!candidates.length) {
      this.logger.warn(
        `No public report text found: stepId=${stepId}, completedSubmissions=${submissions.length}, excludeMarathonerId=${excludeMarathonerId || 'none'}`,
      );
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const candidate = candidates[randomIndex];
    const submission = candidate.submission;

    this.logger.debug(
      `Selected random submission: index=${randomIndex} of ${candidates.length}, submissionId=${submission.id}, latency=${fetchLatency}ms`,
    );

    const participant = submission.participant;
    const marathon = participant.marathon;
    const step = submission.step;

    this.logger.debug(
      `Processing submission: participantId=${participant.id}, marathonId=${marathon.id}, stepId=${step.id}`,
    );

    const name = participant.name?.trim() || 'Участник марафона';
    this.logger.debug(`Marathoner name resolved: name=${name}`);

    const reportStartTime = Date.now();
    const report = candidate.report;
    const reportLatency = Date.now() - reportStartTime;

    this.logger.log(
      `Random answer generated: stepId=${stepId}, completedSubmissions=${submissions.length}, publicCandidates=${candidates.length}, marathonerName=${name}, reportLength=${report.length}, latency=${reportLatency}ms`,
    );

    return {
      marathoner: {
        name,
      },
      report,
      payload: filterAssignmentPayloadForPublicReport(candidate.payload, candidate.assignmentBlocks),
      complete_time: submission.endAt.toISOString(),
    };
  }
}
