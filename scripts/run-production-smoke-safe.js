#!/usr/bin/env node
/**
 * Guarded production smoke for Marathon.
 * Run inside the Marathon pod so Prisma can reach the cluster DB.
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const prisma = new PrismaClient();
const baseUrl = (process.env.MARATHON_INTERNAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const authUrl = (process.env.AUTH_SERVICE_URL || "http://auth-microservice:3370").replace(/\/$/, "");
const publicBaseUrl = (process.env.MARATHON_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "https://marathon.alfares.cz").replace(/\/$/, "");
const languageCode = process.env.MARATHON_SMOKE_LANGUAGE || "en";
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + crypto.randomBytes(3).toString("hex");
const authEmail = `marathon-prod-smoke-${stamp}@example.invalid`;
const password = `Smoke-${crypto.randomBytes(12).toString("base64url")}1a!`;
const smokeName = `Marathon Prod Smoke ${stamp}`;
const smokePhone = `+420900${String(Date.now()).slice(-9)}`;
const args = new Set(process.argv.slice(2));
const smokeMode = process.env.MARATHON_SMOKE_MODE || (args.has("--gift-replenishment-only") ? "gift-replenishment" : "full");
const giftReplenishmentOnly = smokeMode === "gift-replenishment";

function mask(value) {
  const text = String(value || "");
  if (text.length <= 8) return "***";
  return `${text.slice(0, 4)}***${text.slice(-6)}`;
}

async function jsonFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

  const code = `SMOKE-${languageCode.toUpperCase()}-${Date.now()}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  const gift = await prisma.marathonGift.create({ data: { marathonId, code }, select: { id: true } });
  const after = await prisma.marathonGift.count({ where: { marathonId, usedAt: null } });
  return { created: true, unused: after, giftId: mask(gift.id) };
}

function runCheck(command, args, label) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`.slice(0, 800));
  }
  return true;
}

async function redeemGiftAndReplenish(token, marathon, marathonerId) {
  await ensureReplacementGift(marathon.id);
  const beforeUnused = await prisma.marathonGift.count({ where: { marathonId: marathon.id, usedAt: null } });
  const gift = await prisma.marathonGift.findFirst({
    where: { marathonId: marathon.id, usedAt: null },
    select: { id: true, code: true },
    orderBy: { createdAt: "asc" },
  });
  if (!gift?.code) throw new Error(`no unused gift code available for ${languageCode} marathon`);
  const giftResponse = await jsonFetch("/api/v1/vip/gift-redemptions", {
    method: "POST",
    token,
    label: "gift redemption",
    body: JSON.stringify({ marathonerId, code: gift.code }),
  });
  if (giftResponse?.status !== "vip_unlocked") throw new Error(`gift redemption returned ${giftResponse?.status || "missing status"}`);
  const postRedemptionReplacementGift = await ensureReplacementGift(marathon.id);
  const afterUnused = await prisma.marathonGift.count({ where: { marathonId: marathon.id, usedAt: null } });
  return {
    giftResponse,
    beforeUnused,
    afterUnused,
    postRedemptionReplacementGift,
  };
}

async function registerSmokeParticipant(token, marathon, purpose) {
  const registration = await jsonFetch("/api/v1/registrations", {
    method: "POST",
    token,
    label: `${purpose} phone/email marathon registration`,
    body: JSON.stringify({
      email: authEmail,
      phone: smokePhone,
      name: `${smokeName} ${purpose}`,
      languageCode: marathon.languageCode,
    }),
  });
  if (!registration?.marathonerId || registration.userBound !== true) {
    throw new Error(`${purpose} registration did not create a bound participant`);
  }
  return registration.marathonerId;
}

async function verifyPaymentUnlock(token, marathon) {
  if (!process.env.PAYMENT_WEBHOOK_API_KEY) {
    throw new Error("PAYMENT_WEBHOOK_API_KEY is required for payment unlock proof");
  }

  const marathonerId = await registerSmokeParticipant(token, marathon, "payment");
  const beforeProfile = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}`, {
    token,
    label: "payment profile before checkout",
  });
  if (beforeProfile?.needs_payment !== true || beforeProfile?.type !== "free") {
    throw new Error("payment participant was not payment-gated before checkout");
  }

  const checkout = await jsonFetch("/api/v1/vip/checkout", {
    method: "POST",
    token,
    label: "VIP checkout",
    body: JSON.stringify({ marathonerId }),
  });
  if (checkout?.status !== "checkout_created" || !checkout?.orderId) {
    throw new Error("VIP checkout did not create a payment order");
  }
  const paymentId = checkout?.payment?.data?.paymentId || checkout?.payment?.paymentId;
  if (!paymentId) {
    throw new Error("VIP checkout did not return paymentId for callback reconciliation");
  }
  const checkoutAttempt = await prisma.marathonPaymentAttempt.findUnique({
    where: { orderId: checkout.orderId },
    select: { paymentMethod: true, productId: true },
  });
  if (!checkoutAttempt?.productId) {
    throw new Error("payment attempt ledger did not include productId for callback reconciliation");
  }

  const callback = await jsonFetch("/api/v1/payments/webhook", {
    method: "POST",
    label: "payment webhook settlement",
    headers: { "x-api-key": process.env.PAYMENT_WEBHOOK_API_KEY },
    body: JSON.stringify({
      paymentId,
      orderId: checkout.orderId,
      status: "completed",
      paymentMethod: checkoutAttempt.paymentMethod,
      event: "completed",
      metadata: {
        marathonerId,
        participantId: marathonerId,
        marathonId: marathon.id,
        productId: checkoutAttempt.productId,
      },
    }),
  });
  if (callback?.status !== "vip_unlocked") {
    throw new Error(`payment webhook did not unlock VIP: ${callback?.status || "missing status"}`);
  }

  const afterProfile = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}`, {
    token,
    label: "payment profile after webhook",
  });
  if (afterProfile?.needs_payment !== false || afterProfile?.type !== "vip") {
    throw new Error("payment participant did not become VIP after webhook");
  }

  const attempt = await prisma.marathonPaymentAttempt.findUnique({
    where: { orderId: checkout.orderId },
    select: { status: true, confirmedAt: true },
  });
  if (attempt?.status !== "confirmed" || !attempt?.confirmedAt) {
    throw new Error("payment attempt ledger was not confirmed");
  }

  return {
    marathonerId: mask(marathonerId),
    orderId: mask(checkout.orderId),
    status: callback.status,
    profileType: afterProfile.type,
    ledgerStatus: attempt.status,
  };
}

async function main() {
  if (process.env.MARATHON_SMOKE_EMAIL) {
    throw new Error("MARATHON_SMOKE_EMAIL is forbidden; this runner generates isolated email/phone registration data.");
  }

  const before = {
    participants: await prisma.marathonParticipant.count(),
    giftsUnused: await prisma.marathonGift.count({ where: { usedAt: null } }),
    winners: await prisma.marathonWinner.count(),
    surveys: await prisma.marathonSurveyResponse.count(),
  };

  const auth = await jsonFetch(`${authUrl}/auth/register`, {
    method: "POST",
    label: "auth register",
    body: JSON.stringify({
      email: authEmail,
      password,
      firstName: "Marathon",
      lastName: "Smoke",
      phone: smokePhone,
    }),
  });
  if (!auth?.accessToken || !auth?.user?.id) throw new Error("auth register did not return accessToken/user.id");
  const token = auth.accessToken;
  const userId = auth.user.id;

  const marathon = await jsonFetch(`/api/v1/marathons/by-language/${encodeURIComponent(languageCode)}`, { label: "active marathon" });
  if (!marathon?.id || marathon.languageCode !== languageCode) throw new Error(`active ${languageCode} marathon not found`);
  const steps = await jsonFetch(`/api/v1/steps?marathonId=${encodeURIComponent(marathon.id)}`, { label: "steps" });
  if (!Array.isArray(steps) || steps.length === 0) throw new Error("no steps returned");

  await ensureReplacementGift(marathon.id);
  const paymentUnlock = giftReplenishmentOnly ? null : await verifyPaymentUnlock(token, marathon);
  const marathonerId = await registerSmokeParticipant(token, marathon, giftReplenishmentOnly ? "gift-replenishment" : "gift-winner-nps");
  const giftUnlock = await redeemGiftAndReplenish(token, marathon, marathonerId);
  const postRedemptionReplacementGift = giftUnlock.postRedemptionReplacementGift;

  if (giftReplenishmentOnly) {
    runCheck("node", ["scripts/check-marathon-readiness.js"], "readiness");

    const after = {
      participants: await prisma.marathonParticipant.count(),
      giftsUnused: await prisma.marathonGift.count({ where: { usedAt: null } }),
      winners: await prisma.marathonWinner.count(),
      surveys: await prisma.marathonSurveyResponse.count(),
    };

    const smokeUserParticipants = await prisma.marathonParticipant.count({ where: { userId } });

    console.log(JSON.stringify({
      ok: true,
      smoke: "production-safe-gift-replenishment",
      language: languageCode,
      userId: mask(userId),
      marathonerId: mask(marathonerId),
      vipUnlockedByGift: giftUnlock.giftResponse?.status === "vip_unlocked",
      smokeUserParticipants,
      giftInventory: {
        beforeUnused: giftUnlock.beforeUnused,
        afterUnused: giftUnlock.afterUnused,
        replacement: postRedemptionReplacementGift,
      },
      countDelta: {
        participants: after.participants - before.participants,
        giftsUnused: after.giftsUnused - before.giftsUnused,
        winners: after.winners - before.winners,
        surveys: after.surveys - before.surveys,
      },
      safety: {
        marathonRegistrationUsedEmail: true,
        notificationSendExpected: true,
        submissionsCreated: false,
        winnerExpected: false,
        npsExpected: false,
        fullIdsPrinted: false,
        giftCodePrinted: false,
        tokenPrinted: false,
      },
    }, null, 2));
    return;
  }

  let submitted = 0;
  for (const step of steps) {
    const submission = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/submissions`, {
      method: "POST",
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
    if (!submission?.id || submission.state !== "completed") throw new Error(`submission failed for step ${step.sequence}`);
    submitted += 1;
  }

  const participant = await prisma.marathonParticipant.findUnique({
    where: { id: marathonerId },
    select: { active: true, finishedAt: true, isFree: true, paymentReported: true },
  });
  if (!participant?.finishedAt || participant.active !== false) throw new Error("participant did not finish after all submissions");
  if (participant.isFree !== false || participant.paymentReported !== true) throw new Error("gift redemption did not unlock VIP state");

  const winner = await prisma.marathonWinner.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const medalCount = (winner?.goldCount || 0) + (winner?.silverCount || 0) + (winner?.bronzeCount || 0);
  if (!winner || medalCount < 1) throw new Error("winner row was not created/recomputed with a medal");

  const npsCreate = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/nps`, {
    method: "POST",
    token,
    label: "finished participant NPS create",
    body: JSON.stringify({ score: 10, comment: `Synthetic production smoke NPS create ${stamp}` }),
  });
  if (npsCreate?.score !== 10) throw new Error("NPS endpoint did not persist score 10 on create");

  const npsUpdate = await jsonFetch(`/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/nps`, {
    method: "POST",
    token,
    label: "finished participant NPS update",
    body: JSON.stringify({ score: 9, comment: `Synthetic production smoke NPS update ${stamp}` }),
  });
  if (npsUpdate?.score !== 9) throw new Error("NPS endpoint did not persist score 9 on update");

  const surveyRowsForParticipant = await prisma.marathonSurveyResponse.count({ where: { participantId: marathonerId } });
  if (surveyRowsForParticipant !== 1) {
    throw new Error(`NPS endpoint created ${surveyRowsForParticipant} survey rows for one participant`);
  }

  const replacementGift = await ensureReplacementGift(marathon.id);
  runCheck("node", ["scripts/check-marathon-readiness.js"], "readiness");
  runCheck("node", ["scripts/check-marathon-journey.js", "--base-url", publicBaseUrl], "journey");

  const after = {
    participants: await prisma.marathonParticipant.count(),
    giftsUnused: await prisma.marathonGift.count({ where: { usedAt: null } }),
    winners: await prisma.marathonWinner.count(),
    surveys: await prisma.marathonSurveyResponse.count(),
  };

  console.log(JSON.stringify({
    ok: true,
    smoke: "production-safe-payment-gift-winner-finished-nps",
    language: languageCode,
    userId: mask(userId),
    paymentUnlock,
    marathonerId: mask(marathonerId),
    stepsSubmitted: submitted,
    participantFinished: Boolean(participant.finishedAt),
    vipUnlockedByGift: participant.isFree === false && participant.paymentReported === true,
    winner: { id: mask(winner.id), gold: winner.goldCount, silver: winner.silverCount, bronze: winner.bronzeCount },
    nps: { createScore: npsCreate.score, updateScore: npsUpdate.score, rowsForParticipant: surveyRowsForParticipant },
    replacementGift,
    postRedemptionReplacementGift,
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
      paymentWebhookKeyPrinted: false,
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
