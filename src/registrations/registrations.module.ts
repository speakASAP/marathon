import { Module } from '@nestjs/common';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [RegistrationsController],
  providers: [RegistrationsService, PrismaService],
})
export class RegistrationsModule {}
