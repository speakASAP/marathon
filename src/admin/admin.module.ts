import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AdminController } from './admin.controller';
import { AdminParticipantsController } from './admin-participants.controller';
import { AdminParticipantPaymentsService } from './admin-participant-payments.service';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { AdminTestingController } from './admin-testing.controller';
import { AdminTestingService } from './admin-testing.service';

@Module({
  controllers: [
    AdminController,
    AdminParticipantsController,
    AdminPricingController,
    AdminTestingController,
  ],
  providers: [AdminPricingService, AdminTestingService, AdminParticipantPaymentsService, PrismaService],
})
export class AdminModule {}
