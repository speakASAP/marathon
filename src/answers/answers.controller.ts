import { Controller, Get, Logger, Query, NotFoundException, Req } from '@nestjs/common';
import { Request } from 'express';
import { AnswersService, RandomAnswer } from './answers.service';

@Controller('answers')
export class AnswersController {
  private readonly logger = new Logger(AnswersController.name);

  constructor(private readonly answersService: AnswersService) {}

  @Get('random')
  async getRandom(
    @Query('stepId') stepId: string,
    @Query('excludeMarathonerId') excludeMarathonerId?: string,
    @Req() req?: Request,
  ): Promise<RandomAnswer> {
    this.logger.log(
      `Random answer request received: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`,
    );
    this.logger.debug(`Request details: ${JSON.stringify({
      method: req?.method,
      path: req?.path,
      query: req?.query,
      ip: req?.ip,
    })}`);

    if (!stepId) {
      this.logger.warn('Random answer request missing stepId');
      throw new NotFoundException('stepId is required');
    }

    try {
      const answer = await this.answersService.getRandom(stepId, excludeMarathonerId);
      if (!answer) {
        this.logger.warn(`No random answer found: stepId=${stepId}, excludeMarathonerId=${excludeMarathonerId || 'none'}`);
        throw new NotFoundException('No random answer found');
      }
      this.logger.log(
        `Random answer response: stepId=${stepId}, marathonerId=${answer.marathoner?.name || 'unknown'}, hasReport=${!!answer.report}`,
      );
      return answer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Random answer failed: stepId=${stepId}, error=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
