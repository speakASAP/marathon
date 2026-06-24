import { Injectable, Logger } from '@nestjs/common';
import {
  MarathonAnalytics,
  MarathonCatalogReadiness,
  MarathonLanguage,
  MarathonSummary,
  MarathonsService,
} from '../marathons/marathons.service';
import { StepsService, StepSummary } from '../steps/steps.service';

export const SUPPORT_KNOWLEDGE_VERSION = 'support-chat-knowledge-v1';
export const MARATHON_DURATION_DAYS = 30;
export const MARATHON_STAGE_COUNT = 11;
export const BONUS_DAYS = 0;

export const CANONICAL_MARATHON_FACTS = [
  `Марафон SpeakASAP длится ${MARATHON_DURATION_DAYS} дней: это 30-дневный маршрут ежедневной практики.`,
  `В марафоне ${MARATHON_STAGE_COUNT} грамматических этапов; один этап может занимать 1-3 дня, но это не общая длительность марафона.`,
  'Каждый день участник выполняет языковое задание и публикует отчет.',
  'Следующее задание планируется от выбранного участником ежедневного времени отчета.',
  'Участник может открывать следующие этапы вручную и пройти задания быстрее, но календарная длительность марафона не сжимается.',
  'Марафон открывается после оплаты VIP-доступа; пробные или бонусные бесплатные дни не используются.',
  'При пропуске отчета вовремя этап может считаться поздним по правилам марафона.',
  'Для регистрации нужно открыть /register.',
  'Для продолжения марафона нужно открыть /profile и войти через SpeakASAP.',
  'Для вопросов по конкретному аккаунту нужно написать на marathon@speakasap.com и указать email регистрации, язык марафона и страницу или действие.',
];

export type SupportKnowledgeStep = {
  sequence: number;
  title: string;
  isTrialStep: boolean;
  isPenalized: boolean;
  hasAssignmentContent: boolean;
  assignmentSummary: string;
  formKey: string | null;
  socialLink: string | null;
};

export type SupportKnowledgeMarathon = Pick<
  MarathonSummary,
  'title' | 'languageCode' | 'slug' | 'active' | 'participantCount' | 'isDiscounted' | 'discountEndsAt'
> & {
  stepCount: number;
  trialStepCount: number;
  gatedStepCount: number;
  steps: SupportKnowledgeStep[];
};

export type MarathonKnowledgeSnapshot = {
  version: string;
  generatedAt: string;
  canonicalFacts: string[];
  catalog: {
    ready: boolean;
    registrationOpen: boolean;
    paymentReady: boolean;
    assignmentReady: boolean;
    missing: string[];
    counts: MarathonCatalogReadiness['counts'];
  };
  activeMarathons: SupportKnowledgeMarathon[];
  languages: Array<Pick<MarathonLanguage, 'code' | 'name' | 'full_name' | 'url' | 'payment_url'>>;
  aggregateAnalytics: Pick<MarathonAnalytics, 'participants' | 'assignments' | 'payments' | 'winners' | 'surveys'>;
  participantJourney: string[];
  paymentGiftVip: string[];
  reportSchedule: string[];
  safeActions: string[];
  privacyBoundaries: string[];
};

type CacheEntry = {
  expiresAt: number;
  snapshot: MarathonKnowledgeSnapshot;
};

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_LOAD_TIMEOUT_MS = 2_500;

@Injectable()
export class MarathonKnowledgeService {
  private readonly logger = new Logger(MarathonKnowledgeService.name);
  private cache: CacheEntry | null = null;
  private pendingLoad: Promise<MarathonKnowledgeSnapshot> | null = null;

  constructor(
    private readonly marathonsService: MarathonsService,
    private readonly stepsService: StepsService,
  ) {}

  async getSnapshot(forceRefresh = false): Promise<MarathonKnowledgeSnapshot> {
    const now = Date.now();
    if (!forceRefresh && this.cache && this.cache.expiresAt > now) {
      return this.cache.snapshot;
    }

    if (!forceRefresh && this.pendingLoad) {
      return this.pendingLoad;
    }

    this.pendingLoad = this.withTimeout(this.loadSnapshot(), this.loadTimeoutMs());
    try {
      const snapshot = await this.pendingLoad;
      this.cache = {
        expiresAt: Date.now() + this.ttlMs(),
        snapshot,
      };
      return snapshot;
    } catch (error) {
      if (this.cache) {
        this.logger.warn(`Marathon knowledge refresh failed; using last good snapshot: ${this.errorMessage(error)}`);
        return this.cache.snapshot;
      }
      throw error;
    } finally {
      this.pendingLoad = null;
    }
  }

  buildPromptContext(message: string, snapshot: MarathonKnowledgeSnapshot): string {
    const relevantCatalog = this.relevantStepCatalog(message, snapshot.activeMarathons);
    const digest = snapshot.activeMarathons.map((marathon) => ({
      title: marathon.title,
      languageCode: marathon.languageCode,
      slug: marathon.slug,
      participantCount: marathon.participantCount || 0,
      stepCount: marathon.stepCount,
      trialStepCount: marathon.trialStepCount,
      gatedStepCount: marathon.gatedStepCount,
      stepTitles: marathon.steps.map((step) => ({
        sequence: step.sequence,
        title: step.title,
        isTrialStep: step.isTrialStep,
        isPenalized: step.isPenalized,
      })),
    }));

    return JSON.stringify({
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      canonicalFacts: snapshot.canonicalFacts,
      catalog: snapshot.catalog,
      languages: snapshot.languages,
      activeMarathons: snapshot.activeMarathons.map((marathon) => ({
        title: marathon.title,
        languageCode: marathon.languageCode,
        slug: marathon.slug,
        active: marathon.active,
        participantCount: marathon.participantCount || 0,
        isDiscounted: Boolean(marathon.isDiscounted),
        discountEndsAt: marathon.discountEndsAt || null,
        stepCount: marathon.stepCount,
        trialStepCount: marathon.trialStepCount,
        gatedStepCount: marathon.gatedStepCount,
      })),
      stepCatalogDigest: digest,
      relevantStepCatalog: relevantCatalog,
      aggregateAnalytics: snapshot.aggregateAnalytics,
      participantJourney: snapshot.participantJourney,
      paymentGiftVip: snapshot.paymentGiftVip,
      reportSchedule: snapshot.reportSchedule,
      safeActions: snapshot.safeActions,
      privacyBoundaries: snapshot.privacyBoundaries,
    });
  }

  private async loadSnapshot(): Promise<MarathonKnowledgeSnapshot> {
    const [readiness, analytics, activeMarathons, languages] = await Promise.all([
      this.marathonsService.catalogReadiness(),
      this.marathonsService.analytics(),
      this.marathonsService.list(undefined, true),
      this.marathonsService.listLanguages(),
    ]);

    const activeKnowledge = await Promise.all(
      activeMarathons.map(async (marathon) => {
        const steps = await this.stepsService.listByMarathonId(marathon.id);
        return this.mapMarathon(marathon, steps);
      }),
    );

    return {
      version: SUPPORT_KNOWLEDGE_VERSION,
      generatedAt: new Date().toISOString(),
      canonicalFacts: CANONICAL_MARATHON_FACTS,
      catalog: {
        ready: readiness.ready,
        registrationOpen: readiness.registrationOpen,
        paymentReady: readiness.paymentReady,
        assignmentReady: readiness.assignmentReady,
        missing: readiness.missing,
        counts: readiness.counts,
      },
      activeMarathons: activeKnowledge,
      languages: languages.map((language) => ({
        code: language.code,
        name: language.name,
        full_name: language.full_name,
        url: language.url,
        payment_url: language.payment_url,
      })),
      aggregateAnalytics: {
        participants: analytics.participants,
        assignments: analytics.assignments,
        payments: analytics.payments,
        winners: analytics.winners,
        surveys: analytics.surveys,
      },
      participantJourney: [
        'Новый участник выбирает язык на /register, регистрируется и получает ссылку на профиль марафона.',
        'Для продолжения участник открывает /profile, входит через SpeakASAP и выбирает текущий или доступный заранее этап.',
        'На странице этапа участник читает задание, пишет отчет и отправляет его в своем профиле марафона.',
        'После отправки отчета открываются отчеты других участников по этому этапу, если такие примеры есть.',
        'После всех этапов участник становится финишером и может оставить приватную NPS-оценку.',
      ],
      paymentGiftVip: [
        'VIP-доступ открывает платные этапы марафона после подтвержденной оплаты.',
        'Подарочный код можно использовать только в контексте профиля марафона и после входа.',
        'По конкретной оплате или подарочному коду участник должен писать в поддержку; чат не проверяет коды и платежные реквизиты.',
      ],
      reportSchedule: [
        `Стандартная длительность марафона: ${MARATHON_DURATION_DAYS} дней.`,
        'Ежедневное время отчета выбирается участником в профиле марафона.',
        'Этапы можно открыть заранее вручную, но календарные дни не уменьшаются.',
        'Если участник прошел несколько этапов за один день, следующий календарный этап остается запланированным на будущую дату по расписанию.',
      ],
      safeActions: [
        'Для регистрации открыть /register.',
        'Для продолжения марафона открыть /profile и войти через SpeakASAP.',
        'Для оплаты открыть профиль марафона и использовать VIP-блок.',
        'Для подарочного кода открыть /gift из профиля участника.',
        'Для вопроса с конкретным аккаунтом написать marathon@speakasap.com и указать email регистрации, язык марафона и действие/страницу.',
      ],
      privacyBoundaries: [
        'Не раскрывать email, телефон, userId, participantId, токены, секреты, gift codes, orderId или платежные payload.',
        'Не пересказывать приватные отчеты, submission payload, NPS comments или данные конкретного участника.',
        'Давать только агрегаты, публичные маршруты, безопасные инструкции и общее содержание активных заданий.',
      ],
    };
  }

  private mapMarathon(marathon: MarathonSummary, steps: StepSummary[]): SupportKnowledgeMarathon {
    const mappedSteps = steps.map((step) => this.mapStep(step));
    return {
      title: marathon.title,
      languageCode: marathon.languageCode,
      slug: marathon.slug,
      active: marathon.active,
      participantCount: marathon.participantCount || 0,
      isDiscounted: marathon.isDiscounted,
      discountEndsAt: marathon.discountEndsAt,
      stepCount: mappedSteps.length,
      trialStepCount: mappedSteps.filter((step) => step.isTrialStep).length,
      gatedStepCount: mappedSteps.filter((step) => !step.isTrialStep).length,
      steps: mappedSteps,
    };
  }

  private mapStep(step: StepSummary): SupportKnowledgeStep {
    return {
      sequence: step.sequence,
      title: this.normalizeText(step.title, 160),
      isTrialStep: Boolean(step.isTrialStep),
      isPenalized: Boolean(step.isPenalized),
      hasAssignmentContent: Boolean(step.assignmentContent?.trim()),
      assignmentSummary: this.normalizeText(step.assignmentContent || '', 360),
      formKey: step.formKey || null,
      socialLink: step.socialLink || null,
    };
  }

  private relevantStepCatalog(message: string, marathons: SupportKnowledgeMarathon[]) {
    const normalized = message.toLowerCase();
    const asksAboutSteps = /этап|задан|урок|lesson|step|grammar|граммат/i.test(message);
    const matched = marathons.filter((marathon) => {
      const needles = [
        marathon.languageCode,
        marathon.slug,
        marathon.title,
        this.languageAlias(marathon.languageCode),
      ].filter(Boolean).map((value) => String(value).toLowerCase());
      return needles.some((needle) => needle && normalized.includes(needle));
    });

    const selected = matched.length > 0
      ? matched
      : asksAboutSteps
        ? marathons.slice(0, 3)
        : [];

    return selected.map((marathon) => ({
      title: marathon.title,
      languageCode: marathon.languageCode,
      slug: marathon.slug,
      steps: marathon.steps,
    }));
  }

  private normalizeText(value: string, maxLength: number): string {
    const normalized = value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trim()}…`;
  }

  private languageAlias(code: string): string {
    const aliases: Record<string, string> = {
      en: 'английск english',
      de: 'немецк german deutsch',
      es: 'испанск spanish',
      fr: 'французск french',
      it: 'итальянск italian',
      cz: 'чешск czech',
      tr: 'турецк turkish',
      pt: 'португальск portuguese',
      nl: 'голландск dutch',
      pl: 'польск polish',
      no: 'норвежск norwegian',
      se: 'шведск swedish',
      dk: 'датск danish',
    };
    return aliases[code] || code;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`Marathon knowledge load timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private ttlMs(): number {
    return this.positiveNumber(process.env.SUPPORT_CHAT_KNOWLEDGE_TTL_MS, DEFAULT_TTL_MS);
  }

  private loadTimeoutMs(): number {
    return this.positiveNumber(process.env.SUPPORT_CHAT_KNOWLEDGE_TIMEOUT_MS, DEFAULT_LOAD_TIMEOUT_MS);
  }

  private positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
