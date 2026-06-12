import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MarathonsService } from '../marathons/marathons.service';

export type RunlayerTaskRequest = {
  task_id?: string;
  type?: string;
  payload_ref?: Record<string, unknown>;
  acceptance_criteria?: string[];
};

export type RunlayerTaskResponse = {
  output_ref: Record<string, unknown>;
};

const SUPPORTED_TASK_TYPES = [
  'marathon:readiness_report',
  'marathon:analytics_summary',
  'marathon:participant_engagement_plan',
] as const;

@Injectable()
export class RunlayerService {
  private readonly logger = new Logger(RunlayerService.name);

  constructor(private readonly marathonsService: MarathonsService) {}

  async execute(request: RunlayerTaskRequest): Promise<RunlayerTaskResponse> {
    const type = request?.type || '';
    if (!SUPPORTED_TASK_TYPES.includes(type as (typeof SUPPORTED_TASK_TYPES)[number])) {
      throw new BadRequestException(`Unsupported Marathon RunLayer task type: ${type || 'missing'}`);
    }

    if (type === 'marathon:readiness_report') {
      return this.readinessReport(request);
    }
    if (type === 'marathon:analytics_summary') {
      return this.analyticsSummary(request);
    }
    return this.participantEngagementPlan(request);
  }

  private async readinessReport(request: RunlayerTaskRequest): Promise<RunlayerTaskResponse> {
    const readiness = await this.marathonsService.catalogReadiness();
    return {
      output_ref: {
        source: 'marathon',
        task_id: request.task_id || null,
        task_type: 'marathon:readiness_report',
        generated_at: new Date().toISOString(),
        readiness,
        recommendation: readiness.ready
          ? 'Catalog is launch-ready; run guarded mutating registration/payment/gift/assignment verification with approved inputs.'
          : 'Keep registration closed and obtain approved active Marathon/Product/Gift/Step catalog data before live journey verification.',
      },
    };
  }

  private async analyticsSummary(request: RunlayerTaskRequest): Promise<RunlayerTaskResponse> {
    const analytics = await this.marathonsService.analytics();
    return {
      output_ref: {
        source: 'marathon',
        task_id: request.task_id || null,
        task_type: 'marathon:analytics_summary',
        generated_at: analytics.generatedAt,
        catalog: analytics.catalog,
        participants: analytics.participants,
        assignments: analytics.assignments,
        payments: analytics.payments,
        gifts: analytics.gifts,
        winners: analytics.winners,
        surveys: analytics.surveys,
        privacy: 'Aggregate metrics only; no participant reports, emails, gift codes, tokens, or survey comments are returned.',
      },
    };
  }

  private async participantEngagementPlan(request: RunlayerTaskRequest): Promise<RunlayerTaskResponse> {
    const analytics = await this.marathonsService.analytics();
    const catalogReady = analytics.catalog.ready;
    this.logger.debug(`RunLayer engagement plan requested: catalogReady=${catalogReady}`);

    return {
      output_ref: {
        source: 'marathon',
        task_id: request.task_id || null,
        task_type: 'marathon:participant_engagement_plan',
        generated_at: analytics.generatedAt,
        status: catalogReady ? 'ready_for_operator_review' : 'blocked_by_catalog_readiness',
        available_task_types: [
          {
            type: 'marathon:readiness_report',
            purpose: 'Report launch-readiness blockers without mutating data.',
            data_classification: 'aggregate',
          },
          {
            type: 'marathon:analytics_summary',
            purpose: 'Report aggregate participant, assignment, payment, winner, and NPS metrics.',
            data_classification: 'aggregate',
          },
          {
            type: 'marathon:participant_engagement_plan',
            purpose: 'Suggest safe engagement next steps without exporting participant lists.',
            data_classification: 'aggregate',
          },
        ],
        recommended_next_steps: catalogReady
          ? [
              'Review aggregate completion and payment-conversion metrics.',
              'Create explicit operator-approved notification tasks only after selecting participants inside Marathon-owned authenticated workflows.',
            ]
          : [
              'Load approved launch catalog data.',
              'Run readiness and journey verification before creating participant reminder tasks.',
            ],
        privacy: 'This response intentionally avoids participant identifiers, emails, report text, JWTs, payment secrets, and gift codes.',
      },
    };
  }
}
