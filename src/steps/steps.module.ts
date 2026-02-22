import { Module } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [StepsController],
  providers: [StepsService, PrismaService],
  exports: [StepsService],
})
export class StepsModule {}
