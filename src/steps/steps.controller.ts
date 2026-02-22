import { Controller, Get, Logger, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { StepsService, StepSummary } from './steps.service';

@Controller('steps')
export class StepsController {
  private readonly logger = new Logger(StepsController.name);

  constructor(private readonly stepsService: StepsService) {}

  @Get()
  async list(
    @Query('marathonId') marathonId: string,
    @Req() req?: Request,
  ): Promise<StepSummary[]> {
    this.logger.log(`Steps list request: marathonId=${marathonId || 'none'}`);
    if (!marathonId) {
      return [];
    }
    return this.stepsService.listByMarathonId(marathonId);
  }

  @Get(':stepId')
  async getById(
    @Param('stepId') stepId: string,
    @Req() req?: Request,
  ): Promise<StepSummary> {
    this.logger.log(`Step by id request: stepId=${stepId}`);
    const step = await this.stepsService.getById(stepId);
    if (!step) {
      throw new NotFoundException('Step not found');
    }
    return step;
  }
}
