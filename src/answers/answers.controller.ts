import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { AnswersService, RandomAnswer } from './answers.service';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Get('random')
  async getRandom(
    @Query('stepId') stepId: string,
    @Query('excludeMarathonerId') excludeMarathonerId?: string,
  ): Promise<RandomAnswer> {
    if (!stepId) {
      throw new NotFoundException('stepId is required');
    }
    const answer = await this.answersService.getRandom(stepId, excludeMarathonerId);
    if (!answer) {
      throw new NotFoundException('No random answer found');
    }
    return answer;
  }
}
