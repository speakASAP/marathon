#!/usr/bin/env node
/*
 * Approval-gated correction helper for the one remaining numeric legacy
 * MarathonParticipant.userId orphan.
 *
 * Default mode is dry-run. Apply is blocked unless all gates are present:
 *   --apply
 *   MARATHON_NUMERIC_ORPHAN_APPLY=OWNER_APPROVED_MARATHON_NUMERIC_ORPHAN_2026_07_06
 *   MARATHON_NUMERIC_ORPHAN_TICKET=<ticket/change id>
 *
 * Output policy:
 * - aggregate/count/status output only
 * - no raw legacy ids, Auth UUIDs, participant ids, emails, phones, names,
 *   tokens, DB URLs, or secrets are printed
 * - raw contact values are passed only in-memory between deployed pods
 */

const { execFileSync } = require('child_process');

const namespace = process.env.K8S_NAMESPACE || 'statex-apps';
const marathonDeployment = process.env.MARATHON_DEPLOYMENT || 'deployment/marathon';
const authDeployment = process.env.AUTH_DEPLOYMENT || 'deployment/auth-microservice';
const approvalPhrase = 'OWNER_APPROVED_MARATHON_NUMERIC_ORPHAN_2026_07_06';

const apply = process.argv.includes('--apply');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: options.encoding || 'utf8',
    input: options.input,
    stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
    maxBuffer: options.maxBuffer || 64 * 1024 * 1024,
  });
}

function kubectl(args, options = {}) {
  return run('kubectl', ['-n', namespace, ...args], options);
}

function extractEmbedded(fn) {
  const text = fn.toString();
  return text.slice(text.indexOf('/*') + 2, text.lastIndexOf('*/'));
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
}

function assertApplyAllowed() {
  if (!apply) return;
  const missing = [];
  if (process.env.MARATHON_NUMERIC_ORPHAN_APPLY !== approvalPhrase) {
    missing.push(`MARATHON_NUMERIC_ORPHAN_APPLY=${approvalPhrase}`);
  }
  if (!process.env.MARATHON_NUMERIC_ORPHAN_TICKET) {
    missing.push('MARATHON_NUMERIC_ORPHAN_TICKET=<ticket/change id>');
  }
  if (missing.length) {
    throw new Error(`apply blocked; missing gates: ${missing.join(', ')}`);
  }
}

function kubectlNode(deployment, code, options = {}) {
  const env = options.env || {};
  const envArgs = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  return kubectl(
    [
      'exec',
      '-i',
      deployment,
      '--',
      'env',
      'NODE_PATH=/app/node_modules',
      ...envArgs,
      'node',
      '-e',
      code,
    ],
    { input: options.input || '' },
  );
}

function printPlanOnly() {
  console.log(JSON.stringify({
    ok: true,
    mode: 'plan-only',
    defaultMode: 'dry-run',
    applyAllowed: false,
    applyRequires: {
      cli: ['--apply'],
      env: {
        MARATHON_NUMERIC_ORPHAN_APPLY: approvalPhrase,
        MARATHON_NUMERIC_ORPHAN_TICKET: '<ticket/change id>',
      },
    },
    operation: {
      auth: 'create exactly one Auth user with a generated UUID from the one numeric Marathon participant contact, assign app:marathon:user, mark authSources.marathon, create legacy_identity_mappings row',
      marathon: 'rewrite exactly one numeric MarathonParticipant.userId to the generated Auth UUID',
    },
    outputPolicy: {
      aggregateCountsOnly: true,
      rawLegacyIds: false,
      rawAuthUserIds: false,
      rawParticipantIds: false,
      rawEmails: false,
      rawPhones: false,
      secrets: false,
    },
  }, null, 2));
}

const marathonCollector = extractEmbedded(function embeddedMarathonCollector() { /*
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").trim().replace(/[^0-9+]/g, "");
}

(async () => {
  const rows = await prisma.marathonParticipant.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      userId: true,
      email: true,
      phone: true,
      name: true,
      finishedAt: true,
      active: true,
      _count: { select: { submissions: true } },
    },
  });
  const numeric = rows.filter((row) => /^\d+$/.test(String(row.userId || "")));
  const candidates = numeric.map((row) => ({
    participantId: row.id,
    legacyUserId: Number(row.userId),
    email: normalizeEmail(row.email),
    phone: normalizePhone(row.phone),
    name: String(row.name || "").trim(),
    finished: Boolean(row.finishedAt),
    active: Boolean(row.active),
    submissions: Number(row._count.submissions || 0),
  }));
  console.log(JSON.stringify({
    ok: true,
    totals: {
      numericRows: candidates.length,
      finishedRows: candidates.filter((row) => row.finished).length,
      activeRows: candidates.filter((row) => row.active).length,
      rowsWithSubmissions: candidates.filter((row) => row.submissions > 0).length,
      rowsWithEmail: candidates.filter((row) => row.email).length,
      rowsWithPhone: candidates.filter((row) => row.phone).length,
    },
    candidates,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
*/ });

const authPlanner = extractEmbedded(function embeddedAuthPlanner() { /*
const fs = require("fs");
const { randomUUID } = require("crypto");
const { Client } = require("pg");

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const mode = process.env.NUMERIC_ORPHAN_APPLY === "true" ? "apply" : "dry-run";
const ticket = process.env.NUMERIC_ORPHAN_TICKET || "";

const client = new Client({
  host: process.env.DB_HOST || "db-server-postgres",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "auth",
  user: process.env.DB_USER || "dbadmin",
  password: typeof process.env.DB_PASSWORD === "string" ? process.env.DB_PASSWORD : "",
});

async function q(text, params = []) {
  return (await client.query(text, params)).rows;
}

function mergeMarathonMarker(preferences) {
  const next = preferences && typeof preferences === "object" && !Array.isArray(preferences) ? { ...preferences } : {};
  const authSources = next.authSources && typeof next.authSources === "object" && !Array.isArray(next.authSources) ? { ...next.authSources } : {};
  authSources.marathon = {
    ...(authSources.marathon && typeof authSources.marathon === "object" && !Array.isArray(authSources.marathon) ? authSources.marathon : {}),
    source: "marathon",
    provisioned: true,
    reconciliation: "marathon-numeric-orphan-correction-2026-07-06",
  };
  next.authSources = authSources;
  return next;
}

(async () => {
  await client.connect();
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (candidates.length !== 1) {
    throw new Error(`expected exactly one numeric orphan candidate; found ${candidates.length}`);
  }
  const candidate = candidates[0];
  if (!Number.isInteger(candidate.legacyUserId) || candidate.legacyUserId <= 0) {
    throw new Error("numeric orphan candidate has invalid legacy id");
  }
  if (!candidate.email && !candidate.phone) {
    throw new Error("numeric orphan candidate has no usable email or phone");
  }

  const appRole = await q(
    `SELECT a.id AS "applicationId", r.id AS "roleId"
       FROM applications a
       JOIN roles r ON r."applicationId" = a.id
      WHERE a.name = $1 AND r.scope = $2 AND r.name = $3
      LIMIT 1`,
    ["marathon", "application", "user"],
  );
  if (!appRole[0]) throw new Error("app:marathon:user role not found");

  const mappingRows = await q(
    `SELECT id, "authUserId", status
       FROM legacy_identity_mappings
      WHERE "legacySystem" = $1 AND "legacyUserId" = $2`,
    ["speakasap-portal", candidate.legacyUserId],
  );

  const contactMatches = await q(
    `SELECT COUNT(DISTINCT u.id)::int AS count
       FROM users u
      WHERE ($1::text <> '' AND LOWER(COALESCE(u.email, '')) = $1)
         OR ($2::text <> '' AND regexp_replace(COALESCE(u.phone, ''), '[^0-9+]', '', 'g') = $2)
         OR EXISTS (
              SELECT 1
                FROM jsonb_array_elements(COALESCE(u."contactInfo", '[]'::jsonb)) AS contact
               WHERE (($1::text <> '' AND contact->>'type' = 'email' AND LOWER(COALESCE(contact->>'value', '')) = $1)
                  OR ($2::text <> '' AND contact->>'type' = 'phone' AND regexp_replace(COALESCE(contact->>'value', ''), '[^0-9+]', '', 'g') = $2))
            )`,
    [candidate.email || "", candidate.phone || ""],
  );

  const existingMapping = mappingRows[0] || null;
  const duplicateContactUsers = Number(contactMatches[0]?.count || 0);
  const planned = {
    candidateCount: candidates.length,
    existingMappingCount: mappingRows.length,
    existingMappingHasAuthUser: Boolean(existingMapping?.authUserId),
    duplicateContactUsers,
    willCreateAuthUser: !existingMapping?.authUserId,
    willCreateMapping: !existingMapping,
    willAssignMarathonRole: true,
  };

  let authUserId = existingMapping?.authUserId || null;
  let insertedUser = 0;
  let insertedMapping = 0;
  let insertedRole = 0;
  let updatedMarker = 0;

  if (mode === "apply") {
    if (duplicateContactUsers > 0 && !authUserId) {
      throw new Error("apply blocked; candidate contact matches an existing Auth user");
    }
    await client.query("BEGIN");
    try {
      if (!authUserId) {
        authUserId = randomUUID();
        const contactInfo = [];
        if (candidate.email) contactInfo.push({ type: "email", value: candidate.email, isPrimary: true });
        if (candidate.phone) contactInfo.push({ type: "phone", value: candidate.phone, isPrimary: !candidate.email });
        await client.query(
          `INSERT INTO users (
             id, email, phone, name, "contactInfo", source, "isActive", "isVerified", "userType",
             "perApplicationPreferences", "createdAt", "updatedAt"
           )
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, true, true, $7, $8::jsonb, NOW(), NOW())`,
          [
            authUserId,
            candidate.email || null,
            candidate.phone || null,
            candidate.name || null,
            JSON.stringify(contactInfo),
            "marathon",
            "end_user",
            JSON.stringify(mergeMarathonMarker(null)),
          ],
        );
        insertedUser = 1;
      }

      await client.query(
        `INSERT INTO user_roles (id, "userId", "roleId", "applicationId", "grantedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("userId", "roleId", "applicationId") DO NOTHING`,
        [randomUUID(), authUserId, appRole[0].roleId, appRole[0].applicationId],
      );
      insertedRole = 1;

      const userRows = await q(
        `SELECT id, "perApplicationPreferences"
           FROM users
          WHERE id = $1::uuid`,
        [authUserId],
      );
      if (!userRows[0]) throw new Error("created/mapped Auth user not found");
      await client.query(
        `UPDATE users
            SET "perApplicationPreferences" = $2::jsonb,
                "updatedAt" = NOW()
          WHERE id = $1::uuid`,
        [authUserId, JSON.stringify(mergeMarathonMarker(userRows[0].perApplicationPreferences))],
      );
      updatedMarker = 1;

      if (!existingMapping) {
        await client.query(
          `INSERT INTO legacy_identity_mappings (
             id, "legacySystem", "legacyUserId", "authUserId", "normalizedEmail",
             status, reason, "sourceSnapshot", "createdAt", "updatedAt"
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())`,
          [
            randomUUID(),
            "speakasap-portal",
            candidate.legacyUserId,
            authUserId,
            candidate.email || null,
            "created",
            `owner-approved numeric orphan correction ${ticket}`,
            JSON.stringify({
              source: "marathon",
              reconciliation: "marathon-numeric-orphan-correction-2026-07-06",
              hasEmail: Boolean(candidate.email),
              hasPhone: Boolean(candidate.phone),
              finished: Boolean(candidate.finished),
              submissions: Number(candidate.submissions || 0),
            }),
          ],
        );
        insertedMapping = 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode,
    planned,
    applied: {
      insertedUser,
      insertedMapping,
      insertedRole,
      updatedMarker,
    },
    handoff: mode === "apply" ? {
      authUserId,
      participantId: candidate.participantId,
      legacyUserId: candidate.legacyUserId,
    } : null,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  })
  .finally(() => client.end());
*/ });

const marathonApplier = extractEmbedded(function embeddedMarathonApplier() { /*
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const input = JSON.parse(fs.readFileSync(0, "utf8"));

(async () => {
  const handoff = input.handoff || {};
  if (!handoff.authUserId || !handoff.participantId || !Number.isInteger(handoff.legacyUserId)) {
    throw new Error("missing Auth handoff for Marathon rewrite");
  }
  const updated = await prisma.marathonParticipant.updateMany({
    where: {
      id: handoff.participantId,
      userId: String(handoff.legacyUserId),
    },
    data: { userId: handoff.authUserId },
  });
  console.log(JSON.stringify({
    ok: true,
    updatedParticipantRows: updated.count,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
*/ });

function main() {
  if (process.argv.includes('--plan')) {
    printPlanOnly();
    return;
  }
  assertApplyAllowed();

  const marathonRaw = kubectlNode(marathonDeployment, marathonCollector);
  const marathon = parseJson(marathonRaw, 'marathon collector');
  if (!marathon.ok) throw new Error(marathon.error || 'marathon collector failed');

  const authRaw = kubectl(
    [
      'exec',
      '-i',
      authDeployment,
      '--',
      'env',
      'NODE_PATH=/app/node_modules',
      `NUMERIC_ORPHAN_APPLY=${apply ? 'true' : 'false'}`,
      `NUMERIC_ORPHAN_TICKET=${process.env.MARATHON_NUMERIC_ORPHAN_TICKET || ''}`,
      'node',
      '-e',
      authPlanner,
    ],
    { input: JSON.stringify(marathon) },
  );
  const auth = parseJson(authRaw, 'auth planner');
  if (!auth.ok) throw new Error(auth.error || 'auth planner failed');

  let marathonApply = null;
  if (apply) {
    const rewriteRaw = kubectlNode(marathonDeployment, marathonApplier, { input: JSON.stringify({ handoff: auth.handoff }) });
    marathonApply = parseJson(rewriteRaw, 'marathon applier');
    if (!marathonApply.ok) throw new Error(marathonApply.error || 'marathon applier failed');
  }

  console.log(JSON.stringify({
    ok: true,
    mode: apply ? 'apply' : 'dry-run',
    marathon: {
      totals: marathon.totals,
    },
    auth: {
      planned: auth.planned,
      applied: auth.applied,
    },
    marathonApply: marathonApply ? {
      updatedParticipantRows: marathonApply.updatedParticipantRows,
    } : null,
    applyAllowed: apply,
    outputPolicy: {
      aggregateCountsOnly: true,
      rawLegacyIds: false,
      rawAuthUserIds: false,
      rawParticipantIds: false,
      rawEmails: false,
      rawPhones: false,
      secrets: false,
    },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
}
