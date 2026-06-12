import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type StepSummary = {
  id: string;
  title: string;
  sequence: number;
  assignmentContent: string | null;
  formKey: string | null;
  socialLink: string | null;
};

@Injectable()
export class StepsService {
  private readonly logger = new Logger(StepsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getById(stepId: string): Promise<StepSummary | null> {
    this.logger.debug(`Step requested: stepId=${stepId}`);
    const step = await this.prisma.marathonStep.findUnique({
      where: { id: stepId },
    });
    if (!step) return null;
    return {
      id: step.id,
      title: step.title,
      sequence: step.sequence,
      assignmentContent: step.assignmentContent,
      formKey: step.formKey,
      socialLink: step.socialLink,
    };
  }

  async listByMarathonId(marathonId: string): Promise<StepSummary[]> {
    this.logger.debug(`Steps list requested: marathonId=${marathonId}`);
    const steps = await this.prisma.marathonStep.findMany({
      where: { marathonId },
      orderBy: { sequence: 'asc' },
    });
    return steps.map((s) => ({
      id: s.id,
      title: s.title,
      sequence: s.sequence,
      assignmentContent: s.assignmentContent,
      formKey: s.formKey,
      socialLink: s.socialLink,
    }));
  }
}
