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

    const registrationOpen = activeMarathons > 0;
    const paymentReady = registrationOpen && allActiveHaveProducts;
    const giftReady = registrationOpen && allActiveHaveGifts;
    const assignmentReady = registrationOpen && allActiveHaveSteps && allActiveHaveGatedSteps && allActiveStepsHaveContent;

    return {
      ready: registrationOpen && paymentReady && giftReady && assignmentReady,
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
