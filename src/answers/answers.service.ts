import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type RandomAnswer = {
  marathoner: {
    name: string;
  };
  report: string;
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

    this.logger.debug(`Database query filters: ${JSON.stringify(where)}`);
    const dbStartTime = Date.now();
    const submissions = await this.prisma.stepSubmission.findMany({
      where,
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
    const dbLatency = Date.now() - dbStartTime;

    this.logger.log(
      `Random answer database query completed: found=${submissions.length}, latency=${dbLatency}ms`,
    );

    if (submissions.length === 0) {
      this.logger.warn(`No completed submissions found: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * submissions.length);
    const submission = submissions[randomIndex];
    this.logger.debug(`Selected random submission: index=${randomIndex} of ${submissions.length}, submissionId=${submission.id}`);

    const participant = submission.participant;
    const marathon = participant.marathon;
    const step = submission.step;

    this.logger.debug(
      `Processing submission: participantId=${participant.id}, marathonId=${marathon.id}, stepId=${step.id}`,
    );

    const name = participant.name || `${participant.email || participant.phone || 'Anonymous'}`;
    this.logger.debug(`Marathoner name resolved: name=${name}`);

    const payload = submission.payloadJson as Record<string, any> | null;
    const reportStartTime = Date.now();
    const report = this.generateReport(marathon.title, step.title, payload);
    const reportLatency = Date.now() - reportStartTime;

    this.logger.log(
      `Random answer generated: stepId=${stepId}, marathonerName=${name}, reportLength=${report.length}, latency=${reportLatency}ms`,
    );

    return {
      marathoner: {
        name,
      },
      report,
      complete_time: submission.endAt.toISOString(),
    };
  }

  /**
   * Generates a plain-text report from submission payload.
   * The frontend renders this as text with preserved line breaks.
   */
  private generateReport(marathonTitle: string, stepTitle: string, payload: Record<string, any> | null): string {
    const lines = [`Marathon: ${marathonTitle}`, `Step: ${stepTitle}`];
    if (!payload) {
      return lines.join('\n');
    }

    for (const [key, value] of Object.entries(payload)) {
      lines.push(`${key}: ${this.stringifyPayloadValue(value)}`);
    }
    return lines.join('\n');
  }

  private stringifyPayloadValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }
}
