import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AdminController } from './admin.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';

@Module({
  controllers: [AdminController, AdminPricingController],
  providers: [AdminPricingService, PrismaService],
})
export class AdminModule {}
