import { Body, Controller, Get, Logger, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../shared/auth-client';
import { AuthGuard } from '../shared/auth.guard';
import {
  AdminTestPaymentResponse,
  AdminTestingService,
  UpdateTestPaymentInput,
} from './admin-testing.service';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

@Controller('admin/marathons/testing/payment')
@UseGuards(AuthGuard)
export class AdminTestingController {
  private readonly logger = new Logger(AdminTestingController.name);

  constructor(private readonly adminTestingService: AdminTestingService) {}

  @Get()
  async listTestPayments(@Req() req: AuthenticatedRequest): Promise<AdminTestPaymentResponse> {
    this.logger.log(`Admin test payment list requested: userId=${req.user?.id || ''}`);
    return this.adminTestingService.listTestPaymentParticipants(req.user!);
  }

  @Patch()
  async updateTestPayment(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateTestPaymentInput,
  ): Promise<AdminTestPaymentResponse> {
    this.logger.log(
      `Admin test payment update requested: userId=${req.user?.id || ''}, participantId=${typeof body.participantId === 'string' ? body.participantId : ''}`,
    );
    await this.adminTestingService.updateTestPayment(req.user!, body);
    return this.adminTestingService.listTestPaymentParticipants(req.user!);
  }
}
