import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type WinnerSummary = {
  id: string;
  userId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
};

type WinnerRecord = {
  id: string;
  userId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
};

@Injectable()
export class WinnersService {
  private readonly logger = new Logger(WinnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<WinnerSummary[]> {
    this.logger.debug('Winners list requested');
    const winners = (await this.prisma.marathonWinner.findMany({
      orderBy: { createdAt: 'desc' },
    })) as WinnerRecord[];
    return winners.map((winner) => ({
      id: winner.id,
      userId: winner.userId,
      goldCount: winner.goldCount,
      silverCount: winner.silverCount,
      bronzeCount: winner.bronzeCount,
    }));
  }

  async getById(winnerId: string): Promise<WinnerSummary | null> {
    this.logger.debug(`Winner requested (id=${winnerId})`);
    const winner = (await this.prisma.marathonWinner.findUnique({
      where: { id: winnerId },
    })) as WinnerRecord | null;
    if (!winner) {
      return null;
    }
    return {
      id: winner.id,
      userId: winner.userId,
      goldCount: winner.goldCount,
      silverCount: winner.silverCount,
      bronzeCount: winner.bronzeCount,
    };
  }
}
