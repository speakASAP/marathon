import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { excludeSmokeParticipants, smokeParticipantWhere } from "../shared/smoke-filter";

export type WinnerSummary = {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  avatar: string;
  languages: WinnerLanguage[];
};

export type WinnerLanguage = {
  code: string;
  title: string;
};

export type MarathonReview = {
  marathon: string;
  languageCode: string;
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

export type WinnerReconciliationResult = {
  completed: boolean;
  participantId: string;
  userId: string;
  medal: 'gold' | 'silver' | 'bronze' | null;
  winnerId: string | null;
};

type WinnerRecord = {
  id: string;
  userId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
};

type AvatarBucket = 'female' | 'male' | 'neutral';

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
const legacyReviewPhotosByName = new Map<string, string>([
  ['Софья Загиезова', '/img/landing/photo-1.png'],
  ['Светлана Сливка', '/img/landing/photo-2.png'],
  ['Ирина Телесненко', '/img/landing/photo-3.png'],
  ['Наталья Кулешова', '/img/landing/photo-4.png'],
  ['Ирина Трегубова', '/img/landing/photo-5.png'],
  ['Ида Горбачева', '/img/landing/photo-6.png'],
  ['Елена Матвейчук', '/img/landing/photo-7.png'],
  ['Олеся Черкасова', '/img/landing/photo-8.png'],
  ['Надежда Золотарева', '/img/landing/photo-9.png'],
  ['Анна Громова', '/img/landing/photo-10.png'],
]);

const DEFAULT_AVATAR_PUBLIC_BASE_URL = 'https://minio.alfares.cz/catalog-media/marathon/avatars/default';

const femaleFirstNames = new Set([
  'александра',
  'алиса',
  'анастасия',
  'анна',
  'гала',
  'елена',
  'ида',
  'ирина',
  'катерина',
  'ксюша',
  'лана',
  'лидия',
  'любовь',
  'майя',
  'надежда',
  'наталья',
  'наташа',
  'олеся',
  'светлана',
  'софия',
  'софья',
  'таня',
  'татьяна',
  'хельга',
  'юлия',
  'julia',
  'katarina',
  'lana',
  'olesja',
  'valeriya',
  'vita',
]);

const maleFirstNames = new Set([
  'александр',
  'альберт',
  'антон',
  'борис',
  'владимир',
  'евгений',
  'кирилл',
  'никита',
  'рома',
  'anton',
  'boris',
  'vladimir',
]);

@Injectable()
export class WinnersService {
  private readonly logger = new Logger(WinnersService.name);
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL;

  constructor(private readonly prisma: PrismaService) {}

  async list(page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Promise<WinnersPaginated> {
    const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const pageNum = Math.max(1, page);
    const skip = (pageNum - 1) * pageSize;

    this.logger.log(`Winners list service called: page=${pageNum}, limit=${pageSize}, skip=${skip}`);

    const dbStartTime = Date.now();
    const visibleMedalFilter = await this.visibleWinnerWhere(medalFilter);
    const [total, winners] = await Promise.all([
      this.prisma.marathonWinner.count({ where: visibleMedalFilter }),
      this.prisma.marathonWinner.findMany({
        where: visibleMedalFilter,
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

    const items: WinnerSummary[] = await Promise.all((winners as WinnerRecord[]).map(async (w, index) => {
      const [userInfo, languages] = await Promise.all([
        this.getUserInfo(w.userId, w.id, skip + index < 1000),
        this.getWinnerLanguages(w.userId),
      ]);
      return {
        id: w.id,
        name: userInfo.name,
        gold: w.goldCount,
        silver: w.silverCount,
        bronze: w.bronzeCount,
        avatar: userInfo.avatar,
        languages,
      };
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

    if (await this.isSmokeWinnerUser(winner.userId)) {
      this.logger.warn(`Winner is smoke-only and hidden from public detail: winnerId=${winnerId}`);
      return null;
    }

    this.logger.debug(`Fetching user info and reviews for winner: winnerId=${winnerId}`);
    const fetchStartTime = Date.now();
    const [userInfo, reviews, languages] = await Promise.all([
      this.getUserInfo(winner.userId, winner.id, true),
      this.getWinnerReviews(winner.userId),
      this.getWinnerLanguages(winner.userId),
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
      languages,
      reviews,
    };
  }

  async reconcileParticipantCompletion(
    participantId: string,
    userId: string,
  ): Promise<WinnerReconciliationResult> {
    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: participantId,
        userId,
      },
      include: {
        marathon: {
          include: {
            steps: {
              select: { id: true },
            },
          },
        },
        submissions: {
          where: {
            isCompleted: true,
          },
          select: {
            stepId: true,
          },
        },
        penaltyReports: true,
      },
    });

    if (!participant) {
      return { completed: false, participantId, userId, medal: null, winnerId: null };
    }

    const stepIds = new Set(participant.marathon.steps.map((step) => step.id));
    const completedStepIds = new Set(participant.submissions.map((submission) => submission.stepId));
    const completed =
      stepIds.size > 0 &&
      Array.from(stepIds).every((stepId) => completedStepIds.has(stepId));

    if (!completed) {
      return { completed: false, participantId, userId, medal: null, winnerId: null };
    }

    const finishedAt = participant.finishedAt || new Date();
    if (participant.active || !participant.finishedAt) {
      await this.prisma.marathonParticipant.update({
        where: { id: participant.id },
        data: {
          active: false,
          finishedAt,
        },
      });
    }

    const medal = this.getWinnerState(participant);
    const winner = await this.recomputeWinnerMedals(userId);

    this.logger.log(
      `Winner reconciliation complete: userId=${userId}, participantId=${participantId}, medal=${medal || 'none'}, winnerId=${winner?.id || 'none'}`,
    );

    return {
      completed: true,
      participantId,
      userId,
      medal,
      winnerId: winner?.id || null,
    };
  }

  private async getUserInfo(userId: string, avatarSeed: string = userId, usePreview: boolean = true): Promise<{ name: string; avatar: string }> {
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
          return { name, avatar: avatar || await this.resolveWinnerAvatar(userId, name, avatarSeed, usePreview) };
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

    return this.getParticipantPublicProfile(userId, avatarSeed, usePreview);
  }

  private async getParticipantPublicProfile(userId: string, avatarSeed: string = userId, usePreview: boolean = true): Promise<{ name: string; avatar: string }> {
    const participant = await this.prisma.marathonParticipant.findFirst({
      where: excludeSmokeParticipants({
        userId,
        name: { not: null },
      }),
      orderBy: [
        { finishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        name: true,
      },
    });
    const name = participant?.name?.trim() || `Участник #${userId}`;

    return {
      name,
      avatar: await this.resolveWinnerAvatar(userId, name, avatarSeed, usePreview),
    };
  }

  private async resolveWinnerAvatar(userId: string, name: string, _avatarSeed: string, _usePreview: boolean = true): Promise<string> {
    const existing = await this.prisma.marathonUserProfile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      return existing.avatarUrl;
    }

    const legacyPhoto = legacyReviewPhotosByName.get(name);
    if (legacyPhoto) {
      await this.saveUserAvatarProfile(userId, name, legacyPhoto, 'legacy_review_photo');
      return legacyPhoto;
    }

    const avatarUrl = this.getDefaultAvatarUrl(this.getAvatarBucket(name));
    await this.saveUserAvatarProfile(userId, name, avatarUrl, 'default_gender');
    return avatarUrl;
  }

  private async saveUserAvatarProfile(userId: string, displayName: string, avatarUrl: string, avatarSource: string): Promise<void> {
    try {
      await this.prisma.marathonUserProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName,
          avatarUrl,
          avatarSource,
        },
        update: {
          displayName,
          avatarUrl,
          avatarSource,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist marathon user avatar: userId=${userId}, error=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private getDefaultAvatarUrl(bucket: AvatarBucket): string {
    const baseUrl = (process.env.MARATHON_DEFAULT_AVATAR_BASE_URL || DEFAULT_AVATAR_PUBLIC_BASE_URL).replace(/\/+$/, '');
    return `${baseUrl}/${bucket}.svg`;
  }

  private getAvatarBucket(name: string): AvatarBucket {
    const firstName = this.normalizeFirstName(name);
    if (femaleFirstNames.has(firstName)) {
      return 'female';
    }
    if (maleFirstNames.has(firstName)) {
      return 'male';
    }

    if (/^[а-яё]+$/i.test(firstName)) {
      if (['илья', 'кузьма', 'лука', 'никита', 'савва', 'фома'].includes(firstName)) {
        return 'male';
      }
      if (/[ая]$/.test(firstName)) {
        return 'female';
      }
      return 'male';
    }

    if (/^[a-z]+$/i.test(firstName)) {
      if (/[aeiy]$/.test(firstName)) {
        return 'female';
      }
      if (/[bdfklmnprstvz]$/.test(firstName)) {
        return 'male';
      }
    }

    return 'neutral';
  }

  private normalizeFirstName(name: string): string {
    const first = name
      .trim()
      .split(/\s+/)
      .find(Boolean);
    return (first || '')
      .toLocaleLowerCase('ru-RU')
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я]/gi, '');
  }

  private async getWinnerReviews(userId: string): Promise<MarathonReview[]> {
    const participants = await this.prisma.marathonParticipant.findMany({
      where: excludeSmokeParticipants({
        userId,
        finishedAt: { not: null },
      }),
      include: {
        marathon: {
          include: {
            steps: {
              select: { id: true },
            },
          },
        },
        submissions: {
          where: {
            isCompleted: true,
          },
          select: {
            stepId: true,
          },
        },
        penaltyReports: true,
      },
    });

    participants.sort((a, b) => {
      const completedDelta = (a.finishedAt?.getTime() || 0) - (b.finishedAt?.getTime() || 0);
      if (completedDelta !== 0) return completedDelta;

      const createdDelta = a.createdAt.getTime() - b.createdAt.getTime();
      if (createdDelta !== 0) return createdDelta;

      return a.id.localeCompare(b.id);
    });

    const reviews: MarathonReview[] = [];

    for (const participant of participants) {
      const marathon = participant.marathon;

      if (!this.hasCompletedAllSteps(participant)) {
        continue;
      }

      const state = this.getWinnerState(participant) || 'bronze';

      const feedback = await this.getWinnerFeedback(participant);
      if (!feedback.review && !feedback.thanks) {
        continue;
      }

      reviews.push({
        marathon: marathon.title,
        languageCode: marathon.languageCode,
        state,
        completed: participant.finishedAt?.toISOString() || new Date().toISOString(),
        review: feedback.review,
        thanks: feedback.thanks || '',
      });
    }

    return reviews.sort((a, b) => new Date(a.completed).getTime() - new Date(b.completed).getTime());
  }

  private async getWinnerLanguages(userId: string): Promise<WinnerLanguage[]> {
    const participants = await this.prisma.marathonParticipant.findMany({
      where: excludeSmokeParticipants({
        userId,
        finishedAt: { not: null },
      }),
      select: {
        marathon: {
          select: {
            languageCode: true,
            title: true,
          },
        },
      },
      orderBy: [
        { finishedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    const byCode = new Map<string, WinnerLanguage>();

    for (const participant of participants) {
      const code = String(participant.marathon.languageCode || "").toLowerCase();
      if (!code || byCode.has(code)) {
        continue;
      }

      byCode.set(code, {
        code,
        title: participant.marathon.title || code.toUpperCase(),
      });
    }

    return Array.from(byCode.values());
  }

  private async recomputeWinnerMedals(userId: string): Promise<WinnerRecord | null> {
    const participants = await this.prisma.marathonParticipant.findMany({
      where: {
        userId,
        active: false,
        finishedAt: { not: null },
      },
      include: {
        marathon: {
          include: {
            steps: {
              select: { id: true },
            },
          },
        },
        submissions: {
          where: {
            isCompleted: true,
          },
          select: {
            stepId: true,
          },
        },
        penaltyReports: true,
      },
    });

    const medals = { goldCount: 0, silverCount: 0, bronzeCount: 0 };

    for (const participant of participants) {
      const stepIds = new Set(participant.marathon.steps.map((step) => step.id));
      const completedStepIds = new Set(participant.submissions.map((submission) => submission.stepId));
      const completed =
        stepIds.size > 0 &&
        Array.from(stepIds).every((stepId) => completedStepIds.has(stepId));

      if (!completed) {
        continue;
      }

      const medal = this.getWinnerState(participant);
      if (medal === 'gold') medals.goldCount += 1;
      if (medal === 'silver') medals.silverCount += 1;
      if (medal === 'bronze') medals.bronzeCount += 1;
    }

    const existing = (await this.prisma.marathonWinner.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })) as WinnerRecord | null;

    if (medals.goldCount + medals.silverCount + medals.bronzeCount === 0) {
      if (existing) {
        return (await this.prisma.marathonWinner.update({
          where: { id: existing.id },
          data: medals,
        })) as WinnerRecord;
      }
      return null;
    }

    if (existing) {
      return (await this.prisma.marathonWinner.update({
        where: { id: existing.id },
        data: medals,
      })) as WinnerRecord;
    }

    return (await this.prisma.marathonWinner.create({
      data: {
        userId,
        ...medals,
      },
    })) as WinnerRecord;
  }

  private async visibleWinnerWhere(where: Record<string, unknown>): Promise<Record<string, unknown>> {
    const smokeUserIds = await this.getSmokeWinnerUserIds();
    return {
      AND: [
        where,
        smokeUserIds.length > 0 ? { userId: { notIn: smokeUserIds } } : {},
      ],
    };
  }

  private async isSmokeWinnerUser(userId: string): Promise<boolean> {
    const count = await this.prisma.marathonParticipant.count({
      where: {
        AND: [
          smokeParticipantWhere,
          { userId },
        ],
      },
    });
    return count > 0;
  }

  private async getSmokeWinnerUserIds(): Promise<string[]> {
    const participants = await this.prisma.marathonParticipant.findMany({
      where: smokeParticipantWhere,
      select: { userId: true },
    });
    return Array.from(new Set(
      participants
        .map((participant) => participant.userId)
        .filter((userId): userId is string => Boolean(userId)),
    ));
  }

  private getWinnerState(participant: any): 'gold' | 'silver' | 'bronze' {
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

  private hasCompletedAllSteps(participant: any): boolean {
    const stepIds = new Set((participant.marathon?.steps || []).map((step: any) => step.id));
    const completedStepIds = new Set((participant.submissions || []).map((submission: any) => submission.stepId));
    return (
      stepIds.size > 0 &&
      Array.from(stepIds).every((stepId) => completedStepIds.has(stepId))
    );
  }

  private async getWinnerFeedback(participant: any): Promise<{ review: string; thanks: string }> {
    const submissions = await this.prisma.stepSubmission.findMany({
      where: {
        participantId: participant.id,
        isCompleted: true,
      },
      include: {
        step: {
          select: {
            sequence: true,
          },
        },
      },
      orderBy: {
        step: {
          sequence: 'desc',
        },
      },
      take: 8,
    });

    let review = '';
    let thanks = '';

    for (const submission of submissions) {
      if (!submission.payloadJson || typeof submission.payloadJson !== 'object') {
        continue;
      }
      const payload = submission.payloadJson as Record<string, any>;
      review ||= this.cleanFeedbackField(payload.q14);
      thanks ||= this.cleanFeedbackField(payload.q15);
      if (review && thanks) {
        break;
      }
    }

    return { review, thanks };
  }

  private cleanFeedbackField(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }
}
