#!/usr/bin/env node
/**
 * Guarded production smoke for Marathon.
 * Run inside the Marathon pod so Prisma can reach the cluster DB.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const prisma = new PrismaClient();
const baseUrl = (process.env.MARATHON_INTERNAL_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const authUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\/$/, '');
const publicBaseUrl = (process.env.MARATHON_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://marathon.alfares.cz').replace(/\/$/, '');
const languageCode = process.env.MARATHON_SMOKE_LANGUAGE || 'en';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomBytes(3).toString('hex');
const authEmail = `marathon-prod-smoke-${stamp}@example.invalid`;
const password = `Smoke-${crypto.randomBytes(12).toString('base64url')}1a!`;
const smokeName = `Marathon Prod Smoke ${stamp}`;
const smokePhone = `+420900${String(Date.now()).slice(-9)}`;

function mask(value) {
  const text = String(value || '');
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}***${text.slice(-6)}`;
}

async function jsonFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    const message = body?.message || body?.raw || response.statusText;
    throw new Error(`${options.label || path} failed: HTTP ${response.status} ${message}`);
  }
  return body;
}

async function ensureReplacementGift(marathonId) {
  const unused = await prisma.marathonGift.count({ where: { marathonId, usedAt: null } });
  if (unused > 0) return { created: false, unused };

  const code = `SMOKE-${languageCode.toUpperCase()}-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const gift = await prisma.marathonGift.create({ data: { marathonId, code }, select: { id: true } });
  const after = await prisma.marathonGift.count({ where: { marathonId, usedAt: null } });
  return { created: true, unused: after, giftId: mask(gift.id) };
}

function runCheck(command, args, label) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`.slice(0, 800));
  }
  return true;
}

async function main() {
  if (process.env.MARATHON_SMOKE_EMAIL) {
    throw new Error('MARATHON_SMOKE_EMAIL is forbidden; this runner uses phone-only Marathon registration.');
  }

  const before = {
    participants: await prisma.marathonParticipant.count(),
    giftsUnused: await prisma.marathonGift.count({ where: { usedAt: null } }),
    winners: await prisma.marathonWinner.count(),
    surveys: await prisma.marathonSurveyResponse.count(),
  };

  const auth = await jsonFetch(`${authUrl}/auth/register`, {
    method: 'POST',
    label: 'auth register',
    body: JSON.stringify({
      email: authEmail,
      password,
      firstName: 'Marathon',
      lastName: 'Smoke',
      phone: smokePhone,
    }),
  });
  if (!auth?.accessToken || !auth?.user?.id) throw new Error('auth register did not return accessToken/user.id');
  const token = auth.accessToken;
  const userId = auth.user.id;

  const marathon = await jsonFetch(`/api/v1/marathons/by-language/${encodeURIComponent(languageCode)}`, { label: 'active marathon' });
  if (!marathon?.id || marathon.languageCode !== languageCode) throw new Error(`active ${languageCode} marathon not found`);
  const steps = await jsonFetch(`/api/v1/steps?marathonId=${encodeURIComponent(marathon.id)}`, { label: 'steps' });
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('no steps returned');

  const registration = await jsonFetch('/api/v1/registrations', {
    method: 'POST',
    token,
    label: 'phone-only marathon registration',
    body: JSON.stringify({ phone: smokePhone, name: smokeName, languageCode }),
  });
  if (!registration?.marathonerId || registration.userBound !== true) throw new Error('registration did not create a bound participant');
  const marathonerId = registration.marathonerId;

  const gift = await prisma.marathonGift.findFirst({
    where: { marathonId: marathon.id, usedAt: null },
    select: { id: true, code: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!gift?.code) throw new Error(`no unused gift code available for ${languageCode} marathon`);
  const giftResponse = await jsonFetch('/api/v1/vip/gift-redemptions', {
    method: 'POST',
    token,
    label: 'gift redemption',
    body: JSON.stringify({ marathonerId, code: gift.code }),
  });
  if (giftResponse?.status !== 'vip_unlocked') throw new Error(`gift redemption returned ${giftResponse?.status || 'missing status'}`);

  let submitted = 0;
  for (const step of steps) {
    const submission = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/submissions`, {
      method: 'POST',
      token,
      label: `submission ${step.sequence}`,
      body: JSON.stringify({
        stepId: step.id,
        completed: true,
        report: `Synthetic production smoke report ${stamp} step ${step.sequence}`,
        payload: { smoke: true, stamp, stepSequence: step.sequence },
        rating: 10,
      }),
    });
    if (!submission?.id || submission.state !== 'completed') throw new Error(`submission failed for step ${step.sequence}`);
    submitted += 1;
  }

  const participant = await prisma.marathonParticipant.findUnique({
    where: { id: marathonerId },
    select: { active: true, finishedAt: true, isFree: true, paymentReported: true },
  });
  if (!participant?.finishedAt || participant.active !== false) throw new Error('participant did not finish after all submissions');
  if (participant.isFree !== false || participant.paymentReported !== true) throw new Error('gift redemption did not unlock VIP state');

  const winner = await prisma.marathonWinner.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  if (!winner || winner.goldCount < 1) throw new Error('winner row was not created/recomputed with a gold medal');

  const nps = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/nps`, {
    method: 'POST',
    token,
    label: 'finished participant NPS',
    body: JSON.stringify({ score: 10, comment: `Synthetic production smoke NPS ${stamp}` }),
  });
  if (nps?.score !== 10) throw new Error('NPS endpoint did not persist score 10');

  const replacementGift = await ensureReplacementGift(marathon.id);
  runCheck('node', ['scripts/check-marathon-readiness.js'], 'readiness');
  runCheck('node', ['scripts/check-marathon-journey.js', '--base-url', publicBaseUrl], 'journey');

  const after = {
    participants: await prisma.marathonParticipant.count(),
    giftsUnused: await prisma.marathonGift.count({ where: { usedAt: null } }),
    winners: await prisma.marathonWinner.count(),
    surveys: await prisma.marathonSurveyResponse.count(),
  };

  console.log(JSON.stringify({
    ok: true,
    smoke: 'production-safe-gift-winner-finished-nps',
    language: languageCode,
    userId: mask(userId),
    marathonerId: mask(marathonerId),
    stepsSubmitted: submitted,
    participantFinished: Boolean(participant.finishedAt),
    vipUnlockedByGift: participant.isFree === false && participant.paymentReported === true,
    winner: { id: mask(winner.id), gold: winner.goldCount, silver: winner.silverCount, bronze: winner.bronzeCount },
    nps: { score: nps.score },
    replacementGift,
    countDelta: {
      participants: after.participants - before.participants,
      giftsUnused: after.giftsUnused - before.giftsUnused,
      winners: after.winners - before.winners,
      surveys: after.surveys - before.surveys,
    },
    safety: {
      marathonRegistrationUsedEmail: false,
      notificationSendExpected: false,
      fullIdsPrinted: false,
      giftCodePrinted: false,
      tokenPrinted: false,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
