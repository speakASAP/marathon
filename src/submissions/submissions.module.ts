import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { WinnersModule } from '../winners/winners.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [WinnersModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PrismaService],
})
export class SubmissionsModule {}
