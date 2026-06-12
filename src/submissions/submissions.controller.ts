import { Body, Controller, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { SubmissionRequest, SubmissionResponse, SubmissionsService } from './submissions.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

@Controller('me/marathons/:marathonerId/submissions')
@UseGuards(AuthGuard)
export class SubmissionsController {
  private readonly logger = new Logger(SubmissionsController.name);

  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  async submit(
    @Req() req: AuthenticatedRequest,
    @Param('marathonerId') marathonerId: string,
    @Body() body: SubmissionRequest,
  ): Promise<SubmissionResponse> {
    const userId = req.user!.id;
    this.logger.log(`Submission request: userId=${userId}, marathonerId=${marathonerId}, stepId=${body.stepId || ''}`);
    return this.submissionsService.submit(userId, marathonerId, body);
  }
}
