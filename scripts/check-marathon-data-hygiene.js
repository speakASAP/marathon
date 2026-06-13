#!/usr/bin/env node
/**
 * Read-only Marathon legacy data hygiene audit.
 *
 * This script reports known non-blocking imported-data anomalies without
 * exposing participant PII or mutating production records.
 */

const DEFAULT_SAMPLE_LIMIT = 10;

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

function argValue(name, fallback) {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function toNumber(value) {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mask(value) {
  const text = String(value || '');
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}***${text.slice(-6)}`;
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function redactedDatabaseUrl() {
  if (!process.env.DATABASE_URL) return 'not set';
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '[set but not parseable]';
  }
}

async function auditDuplicateSubmissions(prisma, sampleLimit) {
  const [summary] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS groups,
      COALESCE(SUM(duplicate_count - 1), 0)::int AS extra_rows
    FROM (
      SELECT COUNT(*)::int AS duplicate_count
      FROM "StepSubmission"
      GROUP BY "participantId", "stepId"
      HAVING COUNT(*) > 1
    ) duplicate_groups
  `;

  const samples = await prisma.$queryRaw`
    SELECT
      "participantId",
      "stepId",
      COUNT(*)::int AS submission_count,
      SUM(CASE WHEN "isCompleted" THEN 1 ELSE 0 END)::int AS completed_count,
      MIN("createdAt") AS first_created_at,
      MAX("updatedAt") AS last_updated_at
    FROM "StepSubmission"
    GROUP BY "participantId", "stepId"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, MAX("updatedAt") DESC
    LIMIT ${sampleLimit}
  `;

  return {
    groups: toNumber(summary?.groups),
    extraRows: toNumber(summary?.extra_rows),
    samples: samples.map((row) => ({
      participantId: mask(row.participantId),
      stepId: mask(row.stepId),
      submissionCount: toNumber(row.submission_count),
      completedCount: toNumber(row.completed_count),
      firstCreatedAt: iso(row.first_created_at),
      lastUpdatedAt: iso(row.last_updated_at),
    })),
  };
}

async function auditFinishedActiveParticipants(prisma, sampleLimit) {
  const [summary] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS participants
    FROM (
      SELECT
        p.id,
        COUNT(DISTINCT s.id)::int AS total_steps,
        COUNT(DISTINCT CASE WHEN ss."isCompleted" THEN ss."stepId" END)::int AS completed_steps
      FROM "MarathonParticipant" p
      JOIN "MarathonStep" s ON s."marathonId" = p."marathonId"
      LEFT JOIN "StepSubmission" ss ON ss."participantId" = p.id AND ss."stepId" = s.id
      WHERE p.active = TRUE
      GROUP BY p.id
      HAVING COUNT(DISTINCT s.id) > 0
        AND COUNT(DISTINCT CASE WHEN ss."isCompleted" THEN ss."stepId" END) >= COUNT(DISTINCT s.id)
    ) finished_active
  `;

  const samples = await prisma.$queryRaw`
    SELECT
      p.id AS participant_id,
      p."marathonId" AS marathon_id,
      p."finishedAt" AS finished_at,
      COUNT(DISTINCT s.id)::int AS total_steps,
      COUNT(DISTINCT CASE WHEN ss."isCompleted" THEN ss."stepId" END)::int AS completed_steps
    FROM "MarathonParticipant" p
    JOIN "MarathonStep" s ON s."marathonId" = p."marathonId"
    LEFT JOIN "StepSubmission" ss ON ss."participantId" = p.id AND ss."stepId" = s.id
    WHERE p.active = TRUE
    GROUP BY p.id, p."marathonId", p."finishedAt", p."createdAt"
    HAVING COUNT(DISTINCT s.id) > 0
      AND COUNT(DISTINCT CASE WHEN ss."isCompleted" THEN ss."stepId" END) >= COUNT(DISTINCT s.id)
    ORDER BY p."finishedAt" DESC NULLS LAST, p."createdAt" DESC
    LIMIT ${sampleLimit}
  `;

  return {
    participants: toNumber(summary?.participants),
    samples: samples.map((row) => ({
      participantId: mask(row.participant_id),
      marathonId: mask(row.marathon_id),
      completedSteps: toNumber(row.completed_steps),
      totalSteps: toNumber(row.total_steps),
      finishedAt: iso(row.finished_at),
    })),
  };
}

async function auditNegativeRatings(prisma, sampleLimit) {
  const [summary] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS submissions,
      COUNT(DISTINCT "participantId")::int AS participants,
      MIN(rating)::int AS min_rating
    FROM "StepSubmission"
    WHERE rating < 0
  `;

  const distribution = await prisma.$queryRaw`
    SELECT rating::int, COUNT(*)::int AS submissions
    FROM "StepSubmission"
    WHERE rating < 0
    GROUP BY rating
    ORDER BY rating ASC
  `;

  const samples = await prisma.$queryRaw`
    SELECT id, "participantId", "stepId", rating::int, "updatedAt"
    FROM "StepSubmission"
    WHERE rating < 0
    ORDER BY rating ASC, "updatedAt" DESC
    LIMIT ${sampleLimit}
  `;

  return {
    submissions: toNumber(summary?.submissions),
    participants: toNumber(summary?.participants),
    minRating: summary?.min_rating === null || summary?.min_rating === undefined ? null : toNumber(summary.min_rating),
    distribution: distribution.map((row) => ({
      rating: toNumber(row.rating),
      submissions: toNumber(row.submissions),
    })),
    samples: samples.map((row) => ({
      submissionId: mask(row.id),
      participantId: mask(row.participantId),
      stepId: mask(row.stepId),
      rating: toNumber(row.rating),
      updatedAt: iso(row.updatedAt),
    })),
  };
}

async function buildReport() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const sampleLimit = Math.max(1, Math.min(50, toNumber(argValue('--sample-limit', DEFAULT_SAMPLE_LIMIT))));

  try {
    const [duplicateSubmissions, finishedActiveParticipants, negativeRatings] = await Promise.all([
      auditDuplicateSubmissions(prisma, sampleLimit),
      auditFinishedActiveParticipants(prisma, sampleLimit),
      auditNegativeRatings(prisma, sampleLimit),
    ]);

    const findings =
      duplicateSubmissions.groups + finishedActiveParticipants.participants + negativeRatings.submissions;

    return {
      ok: findings === 0,
      mode: 'read-only',
      sampleLimit,
      generatedAt: new Date().toISOString(),
      checks: {
        duplicateSubmissions,
        finishedActiveParticipants,
        negativeRatings,
      },
      recommendation:
        findings === 0
          ? 'No known legacy data hygiene findings were detected.'
          : 'Review samples against source-owner policy before planning any corrective migration. This audit intentionally does not mutate data.',
    };
  } finally {
    await prisma.$disconnect();
  }
}

function printText(report) {
  console.log(`Marathon data hygiene audit: ${report.ok ? 'clean' : 'findings present'}`);
  console.log(`Mode: ${report.mode}; generatedAt=${report.generatedAt}; sampleLimit=${report.sampleLimit}`);

  const duplicate = report.checks.duplicateSubmissions;
  console.log(
    `[${duplicate.groups === 0 ? 'PASS' : 'WARN'}] duplicate-submissions: ${duplicate.groups} participant/step group(s), ${duplicate.extraRows} extra row(s).`,
  );
  for (const sample of duplicate.samples) {
    console.log(
      `  sample participant=${sample.participantId} step=${sample.stepId} submissions=${sample.submissionCount} completed=${sample.completedCount} lastUpdated=${sample.lastUpdatedAt}`,
    );
  }

  const finishedActive = report.checks.finishedActiveParticipants;
  console.log(
    `[${finishedActive.participants === 0 ? 'PASS' : 'WARN'}] finished-active-participants: ${finishedActive.participants} active participant(s) have completed every catalog step.`,
  );
  for (const sample of finishedActive.samples) {
    console.log(
      `  sample participant=${sample.participantId} marathon=${sample.marathonId} completed=${sample.completedSteps}/${sample.totalSteps} finishedAt=${sample.finishedAt}`,
    );
  }

  const negative = report.checks.negativeRatings;
  console.log(
    `[${negative.submissions === 0 ? 'PASS' : 'WARN'}] negative-ratings: ${negative.submissions} submission(s), ${negative.participants} participant(s), min=${negative.minRating}.`,
  );
  if (negative.distribution.length > 0) {
    console.log(`  distribution=${JSON.stringify(negative.distribution)}`);
  }
  for (const sample of negative.samples) {
    console.log(
      `  sample submission=${sample.submissionId} participant=${sample.participantId} step=${sample.stepId} rating=${sample.rating} updatedAt=${sample.updatedAt}`,
    );
  }

  console.log(`Recommendation: ${report.recommendation}`);
}

async function main() {
  try {
    const report = await buildReport();
    if (hasArg('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printText(report);
    }

    if (!report.ok && hasArg('--fail-on-findings')) {
      process.exitCode = 1;
    }
  } catch (error) {
    const failure = {
      ok: false,
      mode: 'read-only',
      generatedAt: new Date().toISOString(),
      error: String(error?.message || error),
      databaseUrl: redactedDatabaseUrl(),
    };
    if (hasArg('--json')) {
      console.log(JSON.stringify(failure, null, 2));
    } else {
      console.error('Marathon data hygiene audit failed.');
      console.error(`Database URL: ${failure.databaseUrl}`);
      console.error(`Reason: ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

main();
