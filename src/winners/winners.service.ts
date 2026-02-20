import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type WinnerSummary = {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  avatar: string;
};

export type MarathonReview = {
  marathon: string;
  state: string;
  completed: string;
  review: string;
  thanks: string;
};

export type WinnerDetail = WinnerSummary & {
  reviews: MarathonReview[];
};

export type WinnersPaginated = {
  items: WinnerSummary[];
  page: number;
  limit: number;
  total: number;
  nextPage: number | null;
  prevPage: number | null;
};

type WinnerRecord = {
  id: string;
  userId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 30;
const medalFilter = {
  OR: [
    { goldCount: { gt: 0 } },
    { silverCount: { gt: 0 } },
    { bronzeCount: { gt: 0 } },
  ],
};
const medalOrder = [
  { goldCount: 'desc' as const },
  { silverCount: 'desc' as const },
  { bronzeCount: 'desc' as const },
];

@Injectable()
export class WinnersService {
  private readonly logger = new Logger(WinnersService.name);
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List winners with fast response: DB-only, no auth service calls.
   * Returns placeholder name (Участник #userId) and empty avatar so the page renders immediately.
   * Winner detail (getById) still fetches full name/avatar from auth for the modal.
   */
  async list(page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Promise<WinnersPaginated> {
    const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const pageNum = Math.max(1, page);
    const skip = (pageNum - 1) * pageSize;

    this.logger.log(`Winners list service called: page=${pageNum}, limit=${pageSize}, skip=${skip}`);

    const dbStartTime = Date.now();
    const [total, winners] = await Promise.all([
      this.prisma.marathonWinner.count({ where: medalFilter }),
      this.prisma.marathonWinner.findMany({
        where: medalFilter,
        orderBy: medalOrder,
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          goldCount: true,
          silverCount: true,
          bronzeCount: true,
        },
      }),
    ]);
    const dbLatency = Date.now() - dbStartTime;

    this.logger.log(
      `Winners list (fast): total=${total}, found=${winners.length}, latency=${dbLatency}ms`,
    );

    const items: WinnerSummary[] = (winners as WinnerRecord[]).map((w) => ({
      id: w.id,
      name: `Участник #${w.userId}`,
      gold: w.goldCount,
      silver: w.silverCount,
      bronze: w.bronzeCount,
      avatar: '',
    }));

    const nextPage = skip + winners.length < total ? pageNum + 1 : null;
    const prevPage = pageNum > 1 ? pageNum - 1 : null;

    return {
      items,
      page: pageNum,
      limit: pageSize,
      total,
      nextPage,
      prevPage,
    };
  }

  async getById(winnerId: string): Promise<WinnerDetail | null> {
    this.logger.log(`Winner detail service called: winnerId=${winnerId}`);

    const dbStartTime = Date.now();
    const winner = (await this.prisma.marathonWinner.findUnique({
      where: { id: winnerId },
    })) as WinnerRecord | null;
    const dbLatency = Date.now() - dbStartTime;

    if (!winner) {
      this.logger.warn(`Winner not found in database: winnerId=${winnerId}, latency=${dbLatency}ms`);
      return null;
    }

    this.logger.debug(
      `Winner found: id=${winner.id}, userId=${winner.userId}, medals=[gold=${winner.goldCount}, silver=${winner.silverCount}, bronze=${winner.bronzeCount}], latency=${dbLatency}ms`,
    );

    const hasMedal =
      winner.goldCount > 0 || winner.silverCount > 0 || winner.bronzeCount > 0;
    if (!hasMedal) {
      this.logger.warn(`Winner has no medals: winnerId=${winnerId}`);
      return null;
    }

    this.logger.debug(`Fetching user info and reviews for winner: winnerId=${winnerId}`);
    const fetchStartTime = Date.now();
    const [userInfo, reviews] = await Promise.all([
      this.getUserInfo(winner.userId),
      this.getWinnerReviews(winner.userId),
    ]);
    const fetchLatency = Date.now() - fetchStartTime;

    this.logger.log(
      `Winner detail completed: winnerId=${winnerId}, reviews=${reviews.length}, latency=${fetchLatency}ms`,
    );

    return {
      id: winner.id,
      name: userInfo.name,
      gold: winner.goldCount,
      silver: winner.silverCount,
      bronze: winner.bronzeCount,
      avatar: userInfo.avatar,
      reviews,
    };
  }

  private async getUserInfo(userId: string): Promise<{ name: string; avatar: string }> {
    if (this.authServiceUrl) {
      const url = `${this.authServiceUrl}/api/users/${userId}`;
      this.logger.debug(`Fetching user info from auth service: userId=${userId}, url=${url}`);
      
      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
        });
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const user = await response.json();
          const firstName = user.firstName || '';
          const lastName = user.lastName || '';
          const name = `${firstName} ${lastName}`.trim() || `Участник #${userId}`;
          const avatar = user.avatar || user.image || '';
          
          this.logger.debug(
            `User info fetched successfully: userId=${userId}, name=${name}, hasAvatar=${!!avatar}, latency=${latency}ms`,
          );
          return { name, avatar };
        } else {
          this.logger.warn(
            `Auth service returned error: userId=${userId}, status=${response.status}, latency=${latency}ms`,
          );
        }
      } catch (error) {
        const latency = Date.now() - startTime;
        this.logger.warn(
          `Failed to fetch user info: userId=${userId}, error=${error instanceof Error ? error.message : String(error)}, latency=${latency}ms`,
        );
      }
    } else {
      this.logger.debug(`Auth service URL not configured, using default name for userId=${userId}`);
    }

    return {
      name: `Участник #${userId}`,
      avatar: '',
    };
  }

  private async getWinnerReviews(userId: string): Promise<MarathonReview[]> {
    const participants = await this.prisma.marathonParticipant.findMany({
      where: {
        userId,
        active: false,
        finishedAt: { not: null },
      },
      include: {
        marathon: true,
        submissions: {
          where: {
            isCompleted: true,
            isChecked: true,
          },
        },
      },
    });

    const allStepsCount = await Promise.all(
      participants.map(async (p) => {
        const stepsCount = await this.prisma.marathonStep.count({
          where: { marathonId: p.marathonId },
        });
        return { participant: p, stepsCount };
      }),
    );

    const winners = allStepsCount.filter(
      (item) => item.participant.submissions.length === item.stepsCount,
    );

    const reviews: MarathonReview[] = [];

    for (const item of winners) {
      const participant = item.participant;
      const marathon = participant.marathon;

      const state = this.getWinnerState(participant);
      if (!state) {
        continue;
      }

      const reviewText = await this.getReviewText(participant);
      const thanksText = await this.getThanksText(participant);

      reviews.push({
        marathon: marathon.title,
        state,
        completed: participant.finishedAt?.toISOString() || new Date().toISOString(),
        review: reviewText,
        thanks: thanksText,
      });
    }

    return reviews.sort((a, b) => new Date(b.completed).getTime() - new Date(a.completed).getTime());
  }

  private getWinnerState(participant: any): string | null {
    if (participant.canUsePenalty && participant.bonusDaysLeft >= 7) {
      return 'gold';
    }
    if (participant.bonusDaysLeft >= 7) {
      const penaltyReports = participant.penaltyReports || [];
      const hasIncompletePenalty = penaltyReports.some((pr: any) => !pr.completed);
      if (!hasIncompletePenalty) {
        return 'silver';
      }
    }
    return 'bronze';
  }

  private async getReviewText(participant: any): Promise<string> {
    const submission = await this.prisma.stepSubmission.findFirst({
      where: {
        participantId: participant.id,
        step: {
          formKey: 'Step11Form3',
        },
      },
    });

    if (submission && submission.payloadJson) {
      const payload = submission.payloadJson as Record<string, any>;
      return payload.q14 || '';
    }

    return '';
  }

  private async getThanksText(participant: any): Promise<string> {
    const submission = await this.prisma.stepSubmission.findFirst({
      where: {
        participantId: participant.id,
        step: {
          formKey: 'Step11Form3',
        },
      },
    });

    if (submission && submission.payloadJson) {
      const payload = submission.payloadJson as Record<string, any>;
      return payload.q15 || '';
    }

    return '';
  }
}
