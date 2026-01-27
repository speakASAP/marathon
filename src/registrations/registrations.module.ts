import { Module } from '@nestjs/common';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';

@Module({
  controllers: [RegistrationsController],
  providers: [RegistrationsService, PrismaService, NotificationsService],
})
export class RegistrationsModule {}
