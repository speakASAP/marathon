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
    this.logger.debug(`Random answer requested (stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'})`);

    const where: any = {
      stepId,
      isCompleted: true,
    };

    if (excludeMarathonerId) {
      where.participantId = { not: excludeMarathonerId };
    }

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

    if (submissions.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * submissions.length);
    const submission = submissions[randomIndex];

    const participant = submission.participant;
    const marathon = participant.marathon;
    const step = submission.step;

    const name = participant.name || `${participant.email || participant.phone || 'Anonymous'}`;

    const payload = submission.payloadJson as Record<string, any> | null;
    const report = this.generateReport(marathon.title, step.title, payload);

    return {
      marathoner: {
        name,
      },
      report,
      complete_time: submission.endAt.toISOString(),
    };
  }

  /**
   * Generates report HTML from submission payload.
   * Note: Legacy implementation uses Django template rendering with form field metadata.
   * This implementation provides functional parity (all data included) but not exact
   * HTML structure parity. For exact parity, would need to integrate Django template
   * engine or replicate template rendering logic.
   */
  private generateReport(marathonTitle: string, stepTitle: string, payload: Record<string, any> | null): string {
    if (!payload) {
      return `<p>Marathon: ${marathonTitle}</p><p>Step: ${stepTitle}</p>`;
    }

    const fields = Object.entries(payload)
      .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
      .join('');

    return `<p>Marathon: ${marathonTitle}</p><p>Step: ${stepTitle}</p>${fields}`;
  }
}
