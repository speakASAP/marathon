import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { excludeSmokeParticipantRelation, excludeSmokeParticipants, smokeParticipantWhere } from "../shared/smoke-filter";

export type MarathonSummary = {
  id: string;
  languageCode: string;
  title: string;
  slug: string;
  active: boolean;
  coverImageUrl?: string;
  landingVideoUrl?: string;
  price?: number;
  currency?: string;
  isDiscounted?: boolean;
  discountEndsAt?: string;
  participantCount?: number;
};

export type MarathonLanguage = {
  id: string;
  code: string;
  small_icon: string;
  payment_url: string;
  name: string;
  full_name: string;
  url: string;
};

export type MarathonCatalogReadiness = {
  ready: boolean;
  registrationOpen: boolean;
  paymentReady: boolean;
  assignmentReady: boolean;
  counts: {
    activeMarathons: number;
    activeLanguages: number;
    marathons: number;
    registeredParticipants: number;
    activeParticipants: number;
    finishedParticipants: number;
    products: number;
    steps: number;
    stepsWithContent: number;
  };
  missing: string[];
};

export type MarathonAnalytics = {
  generatedAt: string;
  catalog: MarathonCatalogReadiness;
  participants: {
    total: number;
    active: number;
    finished: number;
    free: number;
    vip: number;
    vipRequired: number;
    paymentBlocked: number;
  };
  assignments: {
    submissions: number;
    completed: number;
    checked: number;
    penaltyReports: number;
    completionRate: number;
  };
  payments: {
    attempts: number;
    confirmed: number;
    conversionRate: number;
    statusCounts: Record<string, number>;
  };
  winners: {
    rows: number;
    medalRows: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  surveys: {
    responses: number;
    promoters: number;
    passives: number;
    detractors: number;
    averageScore: number;
    npsScore: number;
  };
};

type MarathonRecord = {
  id: string;
  languageCode: string;
  title: string;
  slug: string;
  active: boolean;
  coverImageUrl: string | null;
  landingVideoUrl: string | null;
  discountEndsAt: Date | null;
};

@Injectable()
export class MarathonsService {
  private readonly logger = new Logger(MarathonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(languageCode?: string, active?: boolean): Promise<MarathonSummary[]> {
    this.logger.debug(`Marathons list requested (language=${languageCode || 'all'})`);
    const marathons = (await this.prisma.marathon.findMany({
      where: {
        ...(languageCode ? { languageCode } : {}),
        ...(active === undefined ? {} : { active }),
      },
      orderBy: { createdAt: 'desc' },
    })) as MarathonRecord[];
    const participantCounts = await this.participantCountsByMarathonIds(marathons.map((marathon) => marathon.id));

    return marathons.map((marathon) => ({
      id: marathon.id,
      languageCode: marathon.languageCode,
      title: marathon.title,
      slug: marathon.slug,
      active: marathon.active,
      coverImageUrl: marathon.coverImageUrl || undefined,
      landingVideoUrl: marathon.landingVideoUrl || undefined,
      isDiscounted: marathon.discountEndsAt ? marathon.discountEndsAt > new Date() : false,
      discountEndsAt: marathon.discountEndsAt?.toISOString(),
      participantCount: participantCounts[marathon.id] || 0,
    }));
  }

  async getById(marathonId: string): Promise<MarathonSummary | null> {
    this.logger.debug(`Marathon requested (id=${marathonId})`);
    const marathon = (await this.prisma.marathon.findUnique({
      where: { id: marathonId },
    })) as MarathonRecord | null;
    if (!marathon) {
      return null;
    }
    const participantCount = await this.participantCountForMarathon(marathon.id);

    return {
      id: marathon.id,
      languageCode: marathon.languageCode,
      title: marathon.title,
      slug: marathon.slug,
      active: marathon.active,
      coverImageUrl: marathon.coverImageUrl || undefined,
      landingVideoUrl: marathon.landingVideoUrl || undefined,
      isDiscounted: marathon.discountEndsAt ? marathon.discountEndsAt > new Date() : false,
      discountEndsAt: marathon.discountEndsAt?.toISOString(),
      participantCount,
    };
  }

  async getByLanguage(languageCode: string): Promise<MarathonSummary | null> {
    const requestedLanguage = languageCode.trim().toLowerCase();
    const resolvedLanguageCode = MARATHON_LANGUAGE_ALIASES[requestedLanguage] || requestedLanguage;
    this.logger.debug(`Marathon requested (language=${languageCode}, resolved=${resolvedLanguageCode})`);
    const marathon = (await this.prisma.marathon.findFirst({
      where: {
        active: true,
        OR: [
          { languageCode: resolvedLanguageCode },
          { slug: requestedLanguage },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })) as MarathonRecord | null;
    if (!marathon) {
      return null;
    }
    const participantCount = await this.participantCountForMarathon(marathon.id);

    return {
      id: marathon.id,
      languageCode: marathon.languageCode,
      title: marathon.title,
      slug: marathon.slug,
      active: marathon.active,
      coverImageUrl: marathon.coverImageUrl || undefined,
      landingVideoUrl: marathon.landingVideoUrl || undefined,
      isDiscounted: marathon.discountEndsAt ? marathon.discountEndsAt > new Date() : false,
      discountEndsAt: marathon.discountEndsAt?.toISOString(),
      participantCount,
    };
  }

  async listLanguages(): Promise<MarathonLanguage[]> {
    this.logger.debug('Marathon languages requested');
    const marathons = (await this.prisma.marathon.findMany({
      where: { active: true },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })) as (MarathonRecord & { product: { id: string } | null })[];

    const base = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');

    return marathons.map((marathon) => {
      const meta = LANGUAGE_METADATA[marathon.languageCode] || {
        name: marathon.languageCode.toUpperCase(),
        full_name: marathon.languageCode.toUpperCase(),
        small_icon: '',
      };
      const publicSlug = MARATHON_LANGUAGE_PUBLIC_SLUGS[marathon.languageCode] || marathon.slug;
      const paymentUrl = marathon.product
        ? `${base}/marathon/${marathon.slug}/pay`
        : '';
      const url = `${base}/${publicSlug}`;

      return {
        id: marathon.id,
        code: marathon.languageCode,
        small_icon: meta.small_icon,
        payment_url: paymentUrl,
        name: meta.name,
        full_name: meta.full_name,
        url,
      };
    });
  }

  async catalogReadiness(): Promise<MarathonCatalogReadiness> {
    this.logger.debug('Marathon catalog readiness requested');
    const [
      activeMarathons,
      activeLanguageRows,
      marathons,
      registeredParticipants,
      activeParticipants,
      finishedParticipants,
      products,
      steps,
      allStepContentRows,
    ] = await Promise.all([
      this.prisma.marathon.count({ where: { active: true } }),
      this.prisma.marathon.groupBy({
        by: ['languageCode'],
        where: { active: true },
      }),
      this.prisma.marathon.count(),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants() }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ active: true }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ finishedAt: { not: null } }) }),
      this.prisma.marathonProduct.count(),
      this.prisma.marathonStep.count(),
      this.prisma.marathonStep.findMany({ select: { assignmentContent: true } }),
    ]);
    const stepsWithContent = allStepContentRows.filter((step) => step.assignmentContent?.trim()).length;

    const activeCatalog = await this.prisma.marathon.findMany({
      where: { active: true },
      include: {
        product: { select: { id: true } },
        steps: {
          select: {
            assignmentContent: true,
            isTrialStep: true,
          },
        },
      },
    });

    const allActiveHaveProducts = activeCatalog.length > 0 && activeCatalog.every((marathon) => marathon.product);
    const allActiveHaveSteps = activeCatalog.length > 0 && activeCatalog.every((marathon) => marathon.steps.length > 0);
    const allActiveHaveGatedSteps = activeCatalog.length > 0
      && activeCatalog.every((marathon) => marathon.steps.some((step) => !step.isTrialStep));
    const allActiveStepsHaveContent = activeCatalog.length > 0
      && activeCatalog.every((marathon) => marathon.steps.every((step) => Boolean(step.assignmentContent?.trim())));

    const missing: string[] = [];
    if (activeMarathons === 0) missing.push('active-marathon');
    if (!allActiveHaveSteps) missing.push('steps');
    if (!allActiveHaveGatedSteps) missing.push('gated-step');
    if (!allActiveStepsHaveContent) missing.push('step-content');
    if (!allActiveHaveProducts) missing.push('product');

    const paymentReady = activeCatalog.length > 0 && allActiveHaveProducts;
    const assignmentReady = activeCatalog.length > 0 && allActiveHaveSteps && allActiveHaveGatedSteps && allActiveStepsHaveContent;
    const registrationOpen = paymentReady && assignmentReady;

    return {
      ready: registrationOpen,
      registrationOpen,
      paymentReady,
      assignmentReady,
      counts: {
        activeMarathons,
        activeLanguages: activeLanguageRows.length,
        marathons,
        registeredParticipants,
        activeParticipants,
        finishedParticipants,
        products,
        steps,
        stepsWithContent,
      },
      missing,
    };
  }

  async analytics(): Promise<MarathonAnalytics> {
    this.logger.debug("Marathon analytics requested");
    const catalog = await this.catalogReadiness();
    const smokeParticipants = await this.prisma.marathonParticipant.findMany({
      where: smokeParticipantWhere,
      select: { userId: true },
    });
    const smokeUserIds = Array.from(new Set(
      smokeParticipants
        .map((participant) => participant.userId)
        .filter((userId): userId is string => Boolean(userId)),
    ));
    const visibleWinnerWhere = {
      AND: [
        {
          OR: [
            { goldCount: { gt: 0 } },
            { silverCount: { gt: 0 } },
            { bronzeCount: { gt: 0 } },
          ],
        },
        smokeUserIds.length > 0 ? { userId: { notIn: smokeUserIds } } : {},
      ],
    };
    const visibleWinnerUserWhere = smokeUserIds.length > 0 ? { userId: { notIn: smokeUserIds } } : {};
    const [
      participants,
      activeParticipants,
      finishedParticipants,
      freeParticipants,
      vipParticipants,
      vipRequiredParticipants,
      paymentBlockedParticipants,
      submissions,
      completedSubmissions,
      checkedSubmissions,
      penaltyReports,
      paymentAttempts,
      confirmedPaymentAttempts,
      paymentStatuses,
      winnerRows,
      medalRows,
      medalSums,
      surveyResponses,
      surveyPromoters,
      surveyPassives,
      surveyDetractors,
      surveyScoreAverage,
    ] = await Promise.all([
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants() }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ active: true }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ finishedAt: { not: null } }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ isFree: true }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ isFree: false }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ vipRequired: true }) }),
      this.prisma.marathonParticipant.count({ where: excludeSmokeParticipants({ vipRequired: true, isFree: true }) }),
      this.prisma.stepSubmission.count({ where: excludeSmokeParticipantRelation() }),
      this.prisma.stepSubmission.count({ where: excludeSmokeParticipantRelation({ isCompleted: true }) }),
      this.prisma.stepSubmission.count({ where: excludeSmokeParticipantRelation({ isChecked: true }) }),
      this.prisma.penaltyReport.count({ where: excludeSmokeParticipantRelation() }),
      this.prisma.marathonPaymentAttempt.count({ where: excludeSmokeParticipantRelation() }),
      this.prisma.marathonPaymentAttempt.count({ where: excludeSmokeParticipantRelation({ confirmedAt: { not: null } }) }),
      this.prisma.marathonPaymentAttempt.findMany({ where: excludeSmokeParticipantRelation(), select: { status: true } }),
      this.prisma.marathonWinner.count({ where: visibleWinnerUserWhere }),
      this.prisma.marathonWinner.count({ where: visibleWinnerWhere }),
      this.prisma.marathonWinner.aggregate({
        where: visibleWinnerUserWhere,
        _sum: {
          goldCount: true,
          silverCount: true,
          bronzeCount: true,
        },
      }),
      this.prisma.marathonSurveyResponse.count({ where: excludeSmokeParticipantRelation() }),
      this.prisma.marathonSurveyResponse.count({ where: excludeSmokeParticipantRelation({ score: { gte: 9 } }) }),
      this.prisma.marathonSurveyResponse.count({ where: excludeSmokeParticipantRelation({ score: { gte: 7, lte: 8 } }) }),
      this.prisma.marathonSurveyResponse.count({ where: excludeSmokeParticipantRelation({ score: { lte: 6 } }) }),
      this.prisma.marathonSurveyResponse.aggregate({
        where: excludeSmokeParticipantRelation(),
        _avg: {
          score: true,
        },
      }),
    ]);

    const statusCounts = paymentStatuses.reduce<Record<string, number>>((acc, attempt) => {
      const status = attempt.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      catalog,
      participants: {
        total: participants,
        active: activeParticipants,
        finished: finishedParticipants,
        free: freeParticipants,
        vip: vipParticipants,
        vipRequired: vipRequiredParticipants,
        paymentBlocked: paymentBlockedParticipants,
      },
      assignments: {
        submissions,
        completed: completedSubmissions,
        checked: checkedSubmissions,
        penaltyReports,
        completionRate: this.rate(completedSubmissions, submissions),
      },
      payments: {
        attempts: paymentAttempts,
        confirmed: confirmedPaymentAttempts,
        conversionRate: this.rate(confirmedPaymentAttempts, paymentAttempts),
        statusCounts,
      },
      winners: {
        rows: winnerRows,
        medalRows,
        gold: medalSums._sum.goldCount || 0,
        silver: medalSums._sum.silverCount || 0,
        bronze: medalSums._sum.bronzeCount || 0,
      },
      surveys: {
        responses: surveyResponses,
        promoters: surveyPromoters,
        passives: surveyPassives,
        detractors: surveyDetractors,
        averageScore: Math.round((surveyScoreAverage._avg.score || 0) * 10) / 10,
        npsScore: this.rate(surveyPromoters, surveyResponses) - this.rate(surveyDetractors, surveyResponses),
      },
    };
  }

  private async participantCountForMarathon(marathonId: string): Promise<number> {
    return this.prisma.marathonParticipant.count({
      where: excludeSmokeParticipants({ marathonId }),
    });
  }

  private async participantCountsByMarathonIds(marathonIds: string[]): Promise<Record<string, number>> {
    if (marathonIds.length === 0) return {};

    const rows = await this.prisma.marathonParticipant.groupBy({
      by: ['marathonId'],
      where: excludeSmokeParticipants({ marathonId: { in: marathonIds } }),
      _count: { _all: true },
    });

    return rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.marathonId] = row._count._all;
      return counts;
    }, {});
  }

  private rate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
  }
}

const MARATHON_LANGUAGE_ALIASES: Record<string, string> = {
  english: 'en',
  german: 'de',
  spanish: 'es',
  french: 'fr',
  italian: 'it',
  czech: 'cz',
  turkish: 'tr',
  portuguese: 'pt',
  dutch: 'nl',
  polish: 'pl',
  norwegian: 'no',
  swedish: 'se',
  danish: 'dk',
};

const MARATHON_LANGUAGE_PUBLIC_SLUGS: Record<string, string> = {
  en: 'english',
  de: 'german',
  es: 'spanish',
  fr: 'french',
  it: 'italian',
  cz: 'czech',
  tr: 'turkish',
  pt: 'portuguese',
  nl: 'dutch',
  pl: 'polish',
  no: 'norwegian',
  se: 'swedish',
  dk: 'danish',
};

/** Legacy-parity language metadata (code -> name, full_name, small_icon). */
const LANGUAGE_METADATA: Record<string, { name: string; full_name: string; small_icon: string }> = {
  en: { name: 'English', full_name: 'English', small_icon: '' },
  de: { name: 'Deutsch', full_name: 'German', small_icon: '' },
  fr: { name: 'Français', full_name: 'French', small_icon: '' },
  es: { name: 'Español', full_name: 'Spanish', small_icon: '' },
  it: { name: 'Italiano', full_name: 'Italian', small_icon: '' },
  pt: { name: 'Português', full_name: 'Portuguese', small_icon: '' },
  pl: { name: 'Polski', full_name: 'Polish', small_icon: '' },
  ru: { name: 'Русский', full_name: 'Russian', small_icon: '' },
  uk: { name: 'Українська', full_name: 'Ukrainian', small_icon: '' },
  cz: { name: 'Čeština', full_name: 'Czech', small_icon: '' },
  cs: { name: 'Čeština', full_name: 'Czech', small_icon: '' },
  sk: { name: 'Slovenčina', full_name: 'Slovak', small_icon: '' },
  nl: { name: 'Nederlands', full_name: 'Dutch', small_icon: '' },
  dk: { name: 'Dansk', full_name: 'Danish', small_icon: '' },
  da: { name: 'Dansk', full_name: 'Danish', small_icon: '' },
  se: { name: 'Svenska', full_name: 'Swedish', small_icon: '' },
  sv: { name: 'Svenska', full_name: 'Swedish', small_icon: '' },
  no: { name: 'Norsk', full_name: 'Norwegian', small_icon: '' },
  tr: { name: 'Türkçe', full_name: 'Turkish', small_icon: '' },
};
