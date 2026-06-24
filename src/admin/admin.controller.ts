import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../shared/auth.guard';
import { AuthUser } from '../shared/auth-client';
import {
  AdminPricingService,
  AdminSessionResponse,
} from './admin-pricing.service';

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminPricingService: AdminPricingService) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<AdminSessionResponse> {
    return this.adminPricingService.getAdminSession(req.user!);
  }
}
