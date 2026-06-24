import { Body, Controller, Get, Logger, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { AuthUser } from '../shared/auth-client';
import {
  AdminPricingResponse,
  AdminPricingService,
  UpdateAllMarathonPricesInput,
} from './admin-pricing.service';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

@Controller('admin/marathons/prices')
@UseGuards(AuthGuard)
export class AdminPricingController {
  private readonly logger = new Logger(AdminPricingController.name);

  constructor(private readonly adminPricingService: AdminPricingService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<AdminPricingResponse> {
    this.logger.log(`Admin marathon price list requested: userId=${req.user?.id || ''}`);
    return this.adminPricingService.listActiveMarathonPrices(req.user!);
  }

  @Patch()
  async updateAll(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateAllMarathonPricesInput,
  ): Promise<AdminPricingResponse> {
    this.logger.log(`Admin marathon price update requested: userId=${req.user?.id || ''}`);
    return this.adminPricingService.updateAllActiveMarathonPrices(req.user!, body);
  }
}
