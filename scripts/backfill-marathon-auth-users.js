#!/usr/bin/env node
/**
 * Backfill Marathon participants into auth-microservice contact users.
 *
 * Default mode is dry-run and does not write to auth or Marathon databases, but
 * it does read Marathon participants through Prisma. Use --plan-only for a
 * non-live safety check that performs no DB or Auth API access.
 * Use --apply only after owner approval for a production DB mutation.
 * Use --include-bound with --apply only after separate reconciliation approval.
 */

const authUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\/$/, '');
const batchSize = Math.max(Number(process.env.MARATHON_AUTH_BACKFILL_BATCH_SIZE || '100'), 1);
const apply = process.argv.includes('--apply');
const planOnly = process.argv.includes('--plan-only');
const includeBound = process.argv.includes('--include-bound');
const limitArgIndex = process.argv.indexOf('--limit');
const limit = limitArgIndex >= 0 ? Math.max(Number(process.argv[limitArgIndex + 1] || '0'), 0) : 0;
const APPLY_APPROVAL_PHRASE = 'OWNER_APPROVED_MARATHON_AUTH_BACKFILL_2026_06_24';
const RECONCILIATION_APPROVAL_PHRASE = 'OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_06_24';

function assertApplyApproved() {
  if (!apply) return;
  const missing = [];
  if (planOnly) missing.push('--plan-only must not be combined with --apply');
  if (process.env.MARATHON_AUTH_BACKFILL_APPROVAL !== APPLY_APPROVAL_PHRASE) {
    missing.push(`MARATHON_AUTH_BACKFILL_APPROVAL=${APPLY_APPROVAL_PHRASE}`);
  }
  if (!process.env.MARATHON_AUTH_BACKFILL_TICKET) {
    missing.push('MARATHON_AUTH_BACKFILL_TICKET=<owner-approved change/ticket id>');
  }
  if (includeBound && process.env.MARATHON_AUTH_RECONCILIATION_APPROVAL !== RECONCILIATION_APPROVAL_PHRASE) {
    missing.push(`MARATHON_AUTH_RECONCILIATION_APPROVAL=${RECONCILIATION_APPROVAL_PHRASE} when --include-bound is used with --apply`);
  }
  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL=<Marathon DB DSN supplied by approved runtime profile>');
  }
  if (!process.env.AUTH_SERVICE_URL) {
    missing.push('AUTH_SERVICE_URL=<Auth API base URL supplied by approved runtime profile>');
  }
  if (missing.length > 0) {
    throw new Error(`apply blocked; missing approval gates: ${missing.join(', ')}`);
  }
}

function mask(value) {
  if (!value) return null;
  const text = String(value);
  if (text.includes('@')) {
    const [local, domain] = text.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function printPlan() {
  console.log(JSON.stringify({
    mode: 'plan-only',
    liveAccess: false,
    dbAccess: false,
    authApiAccess: false,
    applyAllowed: false,
    defaultMode: 'dry-run',
    dryRunReadsMarathonDb: true,
    applyRequires: {
      cliFlag: '--apply',
      env: {
        MARATHON_AUTH_BACKFILL_APPROVAL: APPLY_APPROVAL_PHRASE,
        MARATHON_AUTH_BACKFILL_TICKET: '<owner-approved change/ticket id>',
        DATABASE_URL: '<approved Marathon DB profile DSN>',
        AUTH_SERVICE_URL: '<approved Auth API base URL>',
      },
      reconciliationApplyRequires: {
        cliFlag: '--include-bound',
        env: {
          MARATHON_AUTH_RECONCILIATION_APPROVAL: RECONCILIATION_APPROVAL_PHRASE,
        },
      },
    },
    selection: {
      active: true,
      requiresEmail: true,
      requiresPhone: true,
      includeBound,
      limit: limit || null,
      batchSize,
    },
    provisioning: {
      endpoint: '/auth/register-contact',
      source: 'marathon',
      authMarker: 'perApplicationPreferences.authSources.marathon',
      preservesExistingPrimarySource: true,
      storesCanonicalAuthUserIdIn: 'MarathonParticipant.userId when currently empty',
      sessionId: 'marathon:<participantId> compatibility metadata only',
    },
    reporting: {
      output: 'aggregate counts plus up to five masked samples',
      rawContacts: false,
      rawTokens: false,
      rawConnectionStrings: false,
    },
  }, null, 2));
}

async function registerContact(participant) {
  const contactInfo = [
    { type: 'email', value: participant.email.trim().toLowerCase(), isPrimary: true },
    { type: 'phone', value: participant.phone.trim(), isPrimary: false },
  ];
  const response = await fetch(`${authUrl}/auth/register-contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: participant.name || participant.email,
      contactInfo,
      source: 'marathon',
      sessionId: `marathon:${participant.id}`,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.userId !== 'string') {
    throw new Error(`auth register-contact failed status=${response.status}`);
  }
  return { userId: body.userId, isNewUser: body.isNewUser === true };
}

async function main() {
  assertApplyApproved();
  if (planOnly) {
    printPlan();
    return;
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
  const where = {
    active: true,
    email: { not: null },
    phone: { not: null },
    ...(includeBound ? {} : { userId: null }),
  };
  const totalCandidates = await prisma.marathonParticipant.count({ where });
  let cursor;
  let scanned = 0;
  let eligible = 0;
  let skippedMissingContact = 0;
  let skippedBound = 0;
  let skippedLegacyBound = 0;
  let authCreated = 0;
  let authExisting = 0;
  let participantsUpdated = 0;
  const samples = [];

  while (true) {
    const take = limit ? Math.min(batchSize, Math.max(limit - scanned, 0)) : batchSize;
    if (take <= 0) break;
    const rows = await prisma.marathonParticipant.findMany({
      where,
      orderBy: { id: 'asc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, email: true, phone: true, name: true, userId: true, marathonId: true },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const participant of rows) {
      scanned += 1;
      const email = participant.email?.trim().toLowerCase() || '';
      const phone = participant.phone?.trim() || '';
      if (!email || !phone) {
        skippedMissingContact += 1;
        continue;
      }
      if (participant.userId && !includeBound) {
        skippedBound += 1;
        continue;
      }
      if (participant.userId && !isUuid(participant.userId)) {
        skippedLegacyBound += 1;
        continue;
      }
      eligible += 1;
      if (samples.length < 5) {
        samples.push({ participantId: mask(participant.id), email: mask(email), phone: mask(phone), userId: participant.userId ? mask(participant.userId) : null });
      }
      if (!apply) continue;
      const auth = await registerContact({ ...participant, email, phone });
      if (auth.isNewUser) authCreated += 1;
      else authExisting += 1;
      if (!participant.userId) {
        await prisma.marathonParticipant.update({
          where: { id: participant.id },
          data: { userId: auth.userId },
        });
        participantsUpdated += 1;
      }
    }
    if (limit && scanned >= limit) break;
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    authUrlConfigured: Boolean(authUrl),
    includeBound,
    limit: limit || null,
    totalCandidates,
    scanned,
    eligible,
    skippedMissingContact,
    skippedBound,
    skippedLegacyBound,
    authCreated,
    authExisting,
    participantsUpdated,
    samples,
  }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
