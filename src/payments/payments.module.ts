import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, NotificationsService],
})
export class PaymentsModule {}
