import { Controller, Get, Logger, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StepsService, StepSummary } from './steps.service';
import { RadioStreamService } from './radio-stream.service';

@Controller('steps')
export class StepsController {
  private readonly logger = new Logger(StepsController.name);

  constructor(
    private readonly stepsService: StepsService,
    private readonly radioStreamService: RadioStreamService,
  ) {}

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

  @Get('radio-stream')
  async radioStream(
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.radioStreamService.proxy(url, res);
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
