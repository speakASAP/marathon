import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AdminController } from './admin.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { AdminTestingController } from './admin-testing.controller';
import { AdminTestingService } from './admin-testing.service';

@Module({
  controllers: [AdminController, AdminPricingController, AdminTestingController],
  providers: [AdminPricingService, AdminTestingService, PrismaService],
})
export class AdminModule {}
