import { Module } from '@nestjs/common';
import { WinnersController } from './winners.controller';
import { WinnersService } from './winners.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [WinnersController],
  providers: [WinnersService, PrismaService],
})
export class WinnersModule {}
