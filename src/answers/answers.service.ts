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
    const dbStartTime = Date.now();
    const count = await this.prisma.stepSubmission.count({ where });
    const countLatency = Date.now() - dbStartTime;

    this.logger.log(
      `Random answer database count completed: found=${count}, latency=${countLatency}ms`,
    );

    if (count === 0) {
      this.logger.warn(`No completed submissions found: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const fetchStartTime = Date.now();
    const submissions = await this.prisma.stepSubmission.findMany({
      where,
      skip: randomIndex,
      take: 1,
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
    const submission = submissions[0];

    if (!submission) {
      this.logger.warn(`Random answer vanished after count: stepId=${stepId}, randomIndex=${randomIndex}, count=${count}`);
      return null;
    }

    this.logger.debug(
      `Selected random submission: index=${randomIndex} of ${count}, submissionId=${submission.id}, latency=${fetchLatency}ms`,
    );

    const participant = submission.participant;
    const marathon = participant.marathon;
    const step = submission.step;

    this.logger.debug(
      `Processing submission: participantId=${participant.id}, marathonId=${marathon.id}, stepId=${step.id}`,
    );

    const name = participant.name?.trim() || 'Участник марафона';
    this.logger.debug(`Marathoner name resolved: name=${name}`);

    const payload = submission.payloadJson as Record<string, unknown> | null;
    const assignmentBlocks = normalizeAssignmentBlocks(step.assignmentBlocks);
    const reportStartTime = Date.now();
    const report = generateAssignmentReport(payload, assignmentBlocks);
    const reportLatency = Date.now() - reportStartTime;

    this.logger.log(
      `Random answer generated: stepId=${stepId}, resultCount=${count}, marathonerName=${name}, reportLength=${report.length}, latency=${reportLatency}ms`,
    );

    return {
      marathoner: {
        name,
      },
      report,
      payload: filterAssignmentPayloadForPublicReport(payload, assignmentBlocks),
      complete_time: submission.endAt.toISOString(),
    };
  }
}
