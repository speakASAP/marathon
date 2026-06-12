import { Module } from '@nestjs/common';
import { MarathonsModule } from '../marathons/marathons.module';
import { PrismaService } from '../shared/prisma.service';
import { RunlayerController } from './runlayer.controller';
import { RunlayerService } from './runlayer.service';

@Module({
  imports: [MarathonsModule],
  controllers: [RunlayerController],
  providers: [RunlayerService, PrismaService],
})
export class RunlayerModule {}
