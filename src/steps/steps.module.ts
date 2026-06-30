import { Module } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { PrismaService } from '../shared/prisma.service';
import { RadioStreamService } from './radio-stream.service';

@Module({
  controllers: [StepsController],
  providers: [StepsService, PrismaService, RadioStreamService],
  exports: [StepsService],
})
export class StepsModule {}
