import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

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
  giftReady: boolean;
  assignmentReady: boolean;
  counts: {
    activeMarathons: number;
    marathons: number;
    products: number;
    gifts: number;
    unusedGifts: number;
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
  gifts: {
    total: number;
    used: number;
    unused: number;
    redemptionRate: number;
  };
  winners: {
    rows: number;
    medalRows: number;
    gold: number;
    silver: number;
    bronze: number;
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
    };
  }

  async getByLanguage(languageCode: string): Promise<MarathonSummary | null> {
    this.logger.debug(`Marathon requested (language=${languageCode})`);
    const marathon = (await this.prisma.marathon.findFirst({
      where: { languageCode, active: true },
      orderBy: { createdAt: 'desc' },
    })) as MarathonRecord | null;
    if (!marathon) {
      return null;
    }
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
      const paymentUrl = marathon.product
        ? `${base}/marathon/${marathon.slug}/pay`
        : '';
      const url = `${base}/marathon/${marathon.slug}`;

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
      marathons,
      products,
      gifts,
      unusedGifts,
      steps,
      stepsWithContent,
    ] = await Promise.all([
      this.prisma.marathon.count({ where: { active: true } }),
      this.prisma.marathon.count(),
      this.prisma.marathonProduct.count(),
      this.prisma.marathonGift.count(),
      this.prisma.marathonGift.count({ where: { usedAt: null } }),
      this.prisma.marathonStep.count(),
      this.prisma.marathonStep.count({ where: { assignmentContent: { not: null } } }),
    ]);

    const activeCatalog = await this.prisma.marathon.findMany({
      where: { active: true },
      include: {
        product: { select: { id: true } },
        gifts: { where: { usedAt: null }, select: { id: true } },
        steps: {
          select: {
            assignmentContent: true,
            isTrialStep: true,
          },
        },
      },
    });

    const allActiveHaveProducts = activeCatalog.length > 0 && activeCatalog.every((marathon) => marathon.product);
    const allActiveHaveGifts = activeCatalog.length > 0 && activeCatalog.every((marathon) => marathon.gifts.length > 0);
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
    if (!allActiveHaveGifts) missing.push('gift');

    const paymentReady = activeCatalog.length > 0 && allActiveHaveProducts;
    const giftReady = activeCatalog.length > 0 && allActiveHaveGifts;
    const assignmentReady = activeCatalog.length > 0 && allActiveHaveSteps && allActiveHaveGatedSteps && allActiveStepsHaveContent;
    const registrationOpen = paymentReady && giftReady && assignmentReady;

    return {
      ready: registrationOpen,
      registrationOpen,
      paymentReady,
      giftReady,
      assignmentReady,
      counts: {
        activeMarathons,
        marathons,
        products,
        gifts,
        unusedGifts,
        steps,
        stepsWithContent,
      },
      missing,
    };
  }

  async analytics(): Promise<MarathonAnalytics> {
    this.logger.debug('Marathon analytics requested');
    const catalog = await this.catalogReadiness();
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
      totalGifts,
      usedGifts,
      winnerRows,
      medalRows,
      medalSums,
    ] = await Promise.all([
      this.prisma.marathonParticipant.count(),
      this.prisma.marathonParticipant.count({ where: { active: true } }),
      this.prisma.marathonParticipant.count({ where: { finishedAt: { not: null } } }),
      this.prisma.marathonParticipant.count({ where: { isFree: true } }),
      this.prisma.marathonParticipant.count({ where: { isFree: false } }),
      this.prisma.marathonParticipant.count({ where: { vipRequired: true } }),
      this.prisma.marathonParticipant.count({ where: { vipRequired: true, isFree: true } }),
      this.prisma.stepSubmission.count(),
      this.prisma.stepSubmission.count({ where: { isCompleted: true } }),
      this.prisma.stepSubmission.count({ where: { isChecked: true } }),
      this.prisma.penaltyReport.count(),
      this.prisma.marathonPaymentAttempt.count(),
      this.prisma.marathonPaymentAttempt.count({ where: { confirmedAt: { not: null } } }),
      this.prisma.marathonPaymentAttempt.findMany({ select: { status: true } }),
      this.prisma.marathonGift.count(),
      this.prisma.marathonGift.count({ where: { usedAt: { not: null } } }),
      this.prisma.marathonWinner.count(),
      this.prisma.marathonWinner.count({
        where: {
          OR: [
            { goldCount: { gt: 0 } },
            { silverCount: { gt: 0 } },
            { bronzeCount: { gt: 0 } },
          ],
        },
      }),
      this.prisma.marathonWinner.aggregate({
        _sum: {
          goldCount: true,
          silverCount: true,
          bronzeCount: true,
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
      gifts: {
        total: totalGifts,
        used: usedGifts,
        unused: totalGifts - usedGifts,
        redemptionRate: this.rate(usedGifts, totalGifts),
      },
      winners: {
        rows: winnerRows,
        medalRows,
        gold: medalSums._sum.goldCount || 0,
        silver: medalSums._sum.silverCount || 0,
        bronze: medalSums._sum.bronzeCount || 0,
      },
    };
  }

  private rate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
  }
}

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
  cs: { name: 'Čeština', full_name: 'Czech', small_icon: '' },
  sk: { name: 'Slovenčina', full_name: 'Slovak', small_icon: '' },
  nl: { name: 'Nederlands', full_name: 'Dutch', small_icon: '' },
  da: { name: 'Dansk', full_name: 'Danish', small_icon: '' },
  sv: { name: 'Svenska', full_name: 'Swedish', small_icon: '' },
  no: { name: 'Norsk', full_name: 'Norwegian', small_icon: '' },
  tr: { name: 'Türkçe', full_name: 'Turkish', small_icon: '' },
};
