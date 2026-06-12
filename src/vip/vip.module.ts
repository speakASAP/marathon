import { Module } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';

@Module({
  controllers: [VipController],
  providers: [VipService, PrismaService],
})
export class VipModule {}
