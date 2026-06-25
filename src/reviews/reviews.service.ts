import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

export type Review = {
  id: string;
  name: string;
  photo: string;
  text: string;
  thanks: string;
  marathon: string;
  languageCode: string;
  completed: string;
};

export type ReviewsPaginated = {
  items: Review[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
};

type ReviewRow = {
  id: string;
  name: string | null;
  photo: string | null;
  text: string | null;
  thanks: string | null;
  marathon: string | null;
  languageCode: string | null;
  completed: Date | string | null;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const DEFAULT_AVATAR_PUBLIC_BASE_URL = 'https://minio.alfares.cz/catalog-media/marathon/avatars/default';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = DEFAULT_PAGE_SIZE): Promise<ReviewsPaginated> {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)))
      : DEFAULT_PAGE_SIZE;
    const offset = (safePage - 1) * safeLimit;

    this.logger.debug(`Reviews list requested: page=${safePage}, limit=${safeLimit}`);

    const [countRow] = await this.prisma.$queryRawUnsafe<Array<{ total: bigint | number | string }>>(
      this.reviewCountSql(),
    );
    const total = Number(countRow?.total || 0);
    const rows = await this.prisma.$queryRawUnsafe<ReviewRow[]>(
      `${this.reviewRowsSql()} LIMIT ${safeLimit} OFFSET ${offset}`,
    );
    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;

    return {
      items: rows.map((row) => this.mapRow(row)),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      prevPage: safePage > 1 && totalPages > 0 ? safePage - 1 : null,
    };
  }

  private reviewCountSql(): string {
    return `
      WITH public_reviews AS (${this.publicReviewsSql()})
      SELECT COUNT(*)::int AS total FROM public_reviews
    `;
  }

  private reviewRowsSql(): string {
    return `
      WITH public_reviews AS (${this.publicReviewsSql()})
      SELECT
        id,
        name,
        photo,
        text,
        thanks,
        marathon,
        "languageCode",
        completed
      FROM public_reviews
      ORDER BY completed DESC NULLS LAST, id ASC
    `;
  }

  private publicReviewsSql(): string {
    const defaultAvatarBase = (process.env.MARATHON_DEFAULT_AVATAR_BASE_URL || DEFAULT_AVATAR_PUBLIC_BASE_URL)
      .replace(/'/g, "''")
      .replace(/\/+$/, '');

    return `
      SELECT *
      FROM (
        SELECT DISTINCT ON (participant.id)
          submission.id,
          COALESCE(
            NULLIF(TRIM(profile."displayName"), ''),
            NULLIF(TRIM(participant.name), ''),
            'Участник марафона'
          ) AS name,
          COALESCE(NULLIF(TRIM(profile."avatarUrl"), ''), '${defaultAvatarBase}/neutral.svg') AS photo,
          NULLIF(TRIM(COALESCE(submission."payloadJson"->>'q14', '')), '') AS text,
          NULLIF(TRIM(COALESCE(submission."payloadJson"->>'q15', '')), '') AS thanks,
          marathon.title AS marathon,
          marathon."languageCode",
          participant."finishedAt" AS completed
        FROM "StepSubmission" submission
        INNER JOIN "MarathonParticipant" participant ON participant.id = submission."participantId"
        INNER JOIN "Marathon" marathon ON marathon.id = participant."marathonId"
        LEFT JOIN "MarathonStep" step ON step.id = submission."stepId"
        LEFT JOIN "MarathonUserProfile" profile ON profile."userId" = participant."userId"
        WHERE
          submission."isCompleted" = true
          AND submission."payloadJson" IS NOT NULL
          AND participant."finishedAt" IS NOT NULL
          AND step.sequence = (
            SELECT MAX(final_step.sequence)
            FROM "MarathonStep" final_step
            WHERE final_step."marathonId" = participant."marathonId"
          )
          AND (
            participant.name IS NULL
            OR (
              participant.name NOT LIKE 'Marathon Prod Smoke%'
              AND participant.name <> 'Marathon Smoke Test'
            )
          )
          AND (
            participant.email IS NULL
            OR participant.email NOT LIKE '%@example.invalid'
          )
          AND (
            LENGTH(TRIM(COALESCE(submission."payloadJson"->>'q14', ''))) >= 12
            OR LENGTH(TRIM(COALESCE(submission."payloadJson"->>'q15', ''))) >= 12
          )
          AND NOT (
            TRIM(COALESCE(submission."payloadJson"->>'q14', '')) ~ '^[0-9]+$'
            AND LENGTH(TRIM(COALESCE(submission."payloadJson"->>'q15', ''))) = 0
          )
        ORDER BY participant.id, step.sequence DESC NULLS LAST, submission."updatedAt" DESC
      ) selected_reviews
    `;
  }

  private mapRow(row: ReviewRow): Review {
    const completed = row.completed instanceof Date
      ? row.completed.toISOString()
      : row.completed || new Date(0).toISOString();

    return {
      id: row.id,
      name: row.name?.trim() || 'Участник марафона',
      photo: row.photo?.trim() || `${DEFAULT_AVATAR_PUBLIC_BASE_URL}/neutral.svg`,
      text: row.text?.trim() || '',
      thanks: row.thanks?.trim() || '',
      marathon: row.marathon?.trim() || 'Марафон',
      languageCode: row.languageCode?.trim() || '',
      completed,
    };
  }
}
