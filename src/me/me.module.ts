import { Module } from '@nestjs/common';
import { MeController, MeProfileController } from './me.controller';
import { MeService } from './me.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [MeProfileController, MeController],
  providers: [MeService, PrismaService],
})
export class MeModule {}
