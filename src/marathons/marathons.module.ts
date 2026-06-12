import { Module } from '@nestjs/common';
import { MarathonsController } from './marathons.controller';
import { MarathonsService } from './marathons.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [MarathonsController],
  providers: [MarathonsService, PrismaService],
  exports: [MarathonsService],
})
export class MarathonsModule {}
