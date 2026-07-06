#!/usr/bin/env node
/*
 * Approval-gated Marathon/Auth reconciliation helper.
 *
 * Default mode is dry-run. Apply is blocked unless all apply gates are present:
 *   --apply
 *   --phase=auth|marathon|both
 *   --limit=<positive integer>
 *   MARATHON_AUTH_RECONCILIATION_APPLY=OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_07_06
 *   MARATHON_AUTH_RECONCILIATION_TICKET=<ticket/change id>
 *
 * The helper never prints raw user ids, emails, phones, names, DB URLs, or
 * secrets. Temporary raw id mapping files are kept under /tmp and removed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const namespace = process.env.K8S_NAMESPACE || 'statex-apps';
const marathonDeployment = process.env.MARATHON_DEPLOYMENT || 'deployment/marathon';
const authDeployment = process.env.AUTH_DEPLOYMENT || 'deployment/auth-microservice';
const approvalPhrase = 'OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_07_06';

function argValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : '';
}

const apply = process.argv.includes('--apply');
const phase = argValue('--phase') || 'dry-run';
const limit = Number(argValue('--limit') || '0');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: options.encoding || 'utf8',
    input: options.input,
    stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
    maxBuffer: options.maxBuffer || 128 * 1024 * 1024,
  });
}

function kubectl(args, options = {}) {
  return run('kubectl', ['-n', namespace, ...args], options);
}

function readyPodName(appLabel) {
  const raw = kubectl(['get', 'pod', '-l', `app=${appLabel}`, '-o', 'json']);
  const podList = JSON.parse(raw);
  const pod = (podList.items || []).find((item) => {
    const ready = (item.status?.conditions || []).some((condition) => condition.type === 'Ready' && condition.status === 'True');
    return item.status?.phase === 'Running' && ready && !item.metadata?.deletionTimestamp;
  });
  if (!pod?.metadata?.name) throw new Error(`ready pod not found for app=${appLabel}`);
  return pod.metadata.name;
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
}

function extractEmbedded(fn) {
  const text = fn.toString();
  return text.slice(text.indexOf('/*') + 2, text.lastIndexOf('*/'));
}

function assertApplyAllowed() {
  if (!apply) return;
  const missing = [];
  if (!['auth', 'marathon', 'both'].includes(phase)) {
    missing.push('--phase=auth|marathon|both');
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    missing.push('--limit=<positive integer>');
  }
  if (process.env.MARATHON_AUTH_RECONCILIATION_APPLY !== approvalPhrase) {
    missing.push(`MARATHON_AUTH_RECONCILIATION_APPLY=${approvalPhrase}`);
  }
  if (!process.env.MARATHON_AUTH_RECONCILIATION_TICKET) {
    missing.push('MARATHON_AUTH_RECONCILIATION_TICKET=<ticket/change id>');
  }
  if (missing.length) {
    throw new Error(`apply blocked; missing gates: ${missing.join(', ')}`);
  }
}

function printPlanOnly() {
  console.log(JSON.stringify({
    ok: true,
    mode: 'plan-only',
    applyAllowed: false,
    defaultMode: 'dry-run',
    applyRequires: {
      cli: ['--apply', '--phase=auth|marathon|both', '--limit=<positive integer>'],
      env: {
        MARATHON_AUTH_RECONCILIATION_APPLY: approvalPhrase,
        MARATHON_AUTH_RECONCILIATION_TICKET: '<ticket/change id>',
      },
    },
    phaseSemantics: {
      auth: 'grant app:marathon:user and mark authSources.marathon for mapped Auth users; never removes roles',
      marathon: 'rewrite only numeric MarathonParticipant.userId values with verified Auth UUID mappings',
      both: 'auth phase first, then marathon phase; no cross-database transaction',
    },
    outputPolicy: {
      aggregateCountsOnly: true,
      rawUserIds: false,
      rawEmails: false,
      rawPhones: false,
      secrets: false,
    },
  }, null, 2));
}

const marathonCollector = extractEmbedded(function embeddedMarathonCollector() { /*
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const outputPath = process.argv[2];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

(async () => {
  const rows = await prisma.marathonParticipant.findMany({
    select: { userId: true, finishedAt: true, active: true },
  });
  const numeric = {};
  const uuidLike = new Set();
  const totals = {
    participants: rows.length,
    boundRows: 0,
    unboundRows: 0,
    numericRows: 0,
    uuidRows: 0,
    otherRows: 0,
    finishedNumericRows: 0,
    activeNumericRows: 0,
  };
  for (const row of rows) {
    const userId = row.userId ? String(row.userId) : "";
    if (!userId) {
      totals.unboundRows += 1;
      continue;
    }
    totals.boundRows += 1;
    if (/^\d+$/.test(userId)) {
      totals.numericRows += 1;
      if (row.finishedAt) totals.finishedNumericRows += 1;
      if (row.active) totals.activeNumericRows += 1;
      numeric[userId] = (numeric[userId] || 0) + 1;
    } else if (uuid.test(userId)) {
      totals.uuidRows += 1;
      uuidLike.add(userId);
    } else {
      totals.otherRows += 1;
    }
  }
  const payload = {
    ok: true,
    totals,
    numeric,
    distinctNumericUserIds: Object.keys(numeric).length,
    distinctUuidUserIds: uuidLike.size,
  };
  fs.writeFileSync(outputPath, JSON.stringify(payload));
  console.log(JSON.stringify({
    ok: true,
    totals,
    distinctNumericUserIds: payload.distinctNumericUserIds,
    distinctUuidUserIds: payload.distinctUuidUserIds,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
*/ });

const authPhase = extractEmbedded(function embeddedAuthPhase() { /*
const fs = require("fs");
const { randomUUID } = require("crypto");
const { Client } = require("pg");

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const mode = process.env.RECONCILE_APPLY === "true" ? "apply" : "dry-run";
const limit = Number(process.env.RECONCILE_LIMIT || "0");
const stats = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const numericIds = Object.keys(stats.numeric || {}).map(Number);
const limitedNumericIds = mode === "apply" ? numericIds.slice(0, limit) : numericIds;

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

function mappedRowsCount(mappingRows, numericStats) {
  let count = 0;
  for (const row of mappingRows) count += Number(numericStats[String(row.legacyUserId)] || 0);
  return count;
}

function mergeMarathonMarker(preferences) {
  const next = preferences && typeof preferences === "object" && !Array.isArray(preferences) ? { ...preferences } : {};
  const authSources = next.authSources && typeof next.authSources === "object" && !Array.isArray(next.authSources) ? { ...next.authSources } : {};
  authSources.marathon = {
    ...(authSources.marathon && typeof authSources.marathon === "object" && !Array.isArray(authSources.marathon) ? authSources.marathon : {}),
    source: "marathon",
    provisioned: true,
    reconciliation: "marathon-auth-reconciliation-2026-07-06",
  };
  next.authSources = authSources;
  return next;
}

(async () => {
  await client.connect();
  const appRole = await q(
    `SELECT a.id AS "applicationId", r.id AS "roleId"
       FROM applications a
       JOIN roles r ON r."applicationId" = a.id
      WHERE a.name = $1 AND r.scope = $2 AND r.name = $3
      LIMIT 1`,
    ["marathon", "application", "user"],
  );
  if (!appRole[0]) throw new Error("app:marathon:user role not found");

  const mappingRows = limitedNumericIds.length
    ? await q(
        `SELECT "legacyUserId", "authUserId"
           FROM legacy_identity_mappings
          WHERE "legacySystem" = $1
            AND "legacyUserId" = ANY($2::int[])
            AND "authUserId" IS NOT NULL
          ORDER BY "legacyUserId"`,
        ["speakasap-portal", limitedNumericIds],
      )
    : [];
  const authIds = Array.from(new Set(mappingRows.map((row) => row.authUserId).filter(Boolean)));
  const existingRoles = authIds.length
    ? await q(
        `SELECT "userId"
           FROM user_roles
          WHERE "userId" = ANY($1::uuid[])
            AND "roleId" = $2
            AND "applicationId" = $3`,
        [authIds, appRole[0].roleId, appRole[0].applicationId],
      )
    : [];
  const existingRoleUsers = new Set(existingRoles.map((row) => row.userId));
  const missingRoleUsers = authIds.filter((id) => !existingRoleUsers.has(id));
  const markerRows = authIds.length
    ? await q(
        `SELECT id, "perApplicationPreferences",
                jsonb_extract_path("perApplicationPreferences", $2, $3) IS NOT NULL AS "marked"
           FROM users
          WHERE id = ANY($1::uuid[])`,
        [authIds, "authSources", "marathon"],
      )
    : [];
  const markerTargets = markerRows.filter((row) => !row.marked);

  const roleBreakdown = authIds.length
    ? await q(
        `SELECT COALESCE(a.name, $2) AS app, r.scope, r.name, COUNT(*)::int AS count
           FROM user_roles ur
           JOIN roles r ON r.id = ur."roleId"
           LEFT JOIN applications a ON a.id = ur."applicationId"
          WHERE ur."userId" = ANY($1::uuid[])
            AND NOT (r.scope = $3 AND a.name = $4 AND r.name = $5)
          GROUP BY a.name, r.scope, r.name
          ORDER BY count DESC, app, r.scope, r.name`,
        [authIds, "[global-or-missing]", "application", "marathon", "user"],
      )
    : [];

  let insertedRoles = 0;
  let updatedMarkers = 0;
  if (mode === "apply") {
    await client.query("BEGIN");
    try {
      for (const userId of missingRoleUsers) {
        await client.query(
          `INSERT INTO user_roles (id, "userId", "roleId", "applicationId", "grantedAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT ("userId", "roleId", "applicationId") DO NOTHING`,
          [randomUUID(), userId, appRole[0].roleId, appRole[0].applicationId],
        );
        insertedRoles += 1;
      }
      for (const row of markerTargets) {
        await client.query(
          `UPDATE users
              SET "perApplicationPreferences" = $2::jsonb,
                  "updatedAt" = NOW()
            WHERE id = $1`,
          [row.id, JSON.stringify(mergeMarathonMarker(row.perApplicationPreferences))],
        );
        updatedMarkers += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify({
    mappings: mappingRows.map((row) => ({ legacyUserId: row.legacyUserId, authUserId: row.authUserId })),
  }));
  console.log(JSON.stringify({
    ok: true,
    mode,
    phase: "auth",
    selectedDistinctLegacyIds: limitedNumericIds.length,
    mappedDistinctLegacyIds: mappingRows.length,
    mappedParticipantRows: mappedRowsCount(mappingRows, stats.numeric || {}),
    targetDistinctAuthUsers: authIds.length,
    missingRoleAssignmentsBefore: missingRoleUsers.length,
    missingMarkersBefore: markerTargets.length,
    insertedRoleAssignments: insertedRoles,
    updatedMarkers,
    nonMarathonRoleBreakdown: roleBreakdown,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, phase: "auth", error: error.message, code: error.code || null }));
    process.exit(1);
  })
  .finally(() => client.end());
*/ });

const marathonPhase = extractEmbedded(function embeddedMarathonPhase() { /*
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const mappingPath = process.argv[2];
const mode = process.env.RECONCILE_APPLY === "true" ? "apply" : "dry-run";
const mappings = JSON.parse(fs.readFileSync(mappingPath, "utf8")).mappings || [];
const chunkSize = 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizedMappings() {
  return mappings.map((mapping) => {
    const legacyUserId = String(mapping.legacyUserId);
    const authUserId = String(mapping.authUserId);
    if (!/^\d+$/.test(legacyUserId)) {
      throw new Error("invalid legacy user id in mapping file");
    }
    if (!uuid.test(authUserId)) {
      throw new Error("invalid auth user id in mapping file");
    }
    return { legacyUserId, authUserId };
  });
}

function valuesSql(chunk) {
  return chunk.map((_, index) => {
    const offset = index * 2;
    return `($${offset + 1}::text, $${offset + 2}::text)`;
  }).join(",");
}

function valuesParams(chunk) {
  return chunk.flatMap((mapping) => [mapping.legacyUserId, mapping.authUserId]);
}

(async () => {
  let candidateRows = 0;
  let updatedRows = 0;
  const sanitized = sanitizedMappings();

  for (let start = 0; start < sanitized.length; start += chunkSize) {
    const chunk = sanitized.slice(start, start + chunkSize);
    const sqlValues = valuesSql(chunk);
    const params = valuesParams(chunk);

    const countRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count
         FROM "MarathonParticipant" p
         JOIN (VALUES ${sqlValues}) AS m("legacyUserId", "authUserId")
           ON p."userId" = m."legacyUserId"`,
      ...params,
    );
    candidateRows += Number(countRows[0]?.count || 0);

    if (mode === "apply") {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "MarathonParticipant" AS p
            SET "userId" = m."authUserId"
           FROM (VALUES ${sqlValues}) AS m("legacyUserId", "authUserId")
          WHERE p."userId" = m."legacyUserId"`,
        ...params,
      );
      updatedRows += Number(result || 0);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode,
    phase: "marathon",
    mappingCount: sanitized.length,
    candidateRows,
    updatedRows,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, phase: "marathon", error: error.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
*/ });

async function main() {
  if (process.argv.includes('--plan-only')) {
    printPlanOnly();
    return;
  }
  assertApplyAllowed();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marathon-auth-apply-'));
  const localStatsPath = path.join(tempDir, 'marathon-stats.json');
  const localMappingPath = path.join(tempDir, 'mapping.json');
  const remoteStatsPath = `/tmp/marathon-auth-reconcile-stats-${process.pid}.json`;
  const remoteMappingPath = `/tmp/marathon-auth-reconcile-map-${process.pid}.json`;
  const authNeedsApply = apply && ['auth', 'both'].includes(phase);
  const marathonNeedsApply = apply && ['marathon', 'both'].includes(phase);

  try {
    const marathonPod = readyPodName('marathon');
    const authPod = readyPodName('auth-microservice');
    if (!marathonPod || !authPod) throw new Error('required pod not found');

    const collectorRaw = kubectl([
      'exec',
      marathonDeployment,
      '--',
      'sh',
      '-lc',
      `set -e\ncd /app\nnode - ${remoteStatsPath} <<'NODE'\n${marathonCollector}\nNODE`,
    ]);
    const collector = parseJson(collectorRaw, 'Marathon collector');
    kubectl(['cp', `${marathonPod}:${remoteStatsPath}`, localStatsPath], { stdio: ['pipe', 'ignore', 'pipe'] });
    kubectl(['exec', marathonDeployment, '--', 'rm', '-f', remoteStatsPath], { stdio: ['pipe', 'ignore', 'pipe'] });

    kubectl(['cp', localStatsPath, `${authPod}:${remoteStatsPath}`], { stdio: ['pipe', 'ignore', 'pipe'] });
    const authRaw = kubectl([
      'exec',
      authDeployment,
      '--',
      'sh',
      '-lc',
      `set -e\ncd /app\nRECONCILE_APPLY=${authNeedsApply ? 'true' : 'false'} RECONCILE_LIMIT=${apply ? limit : 0} node - ${remoteStatsPath} ${remoteMappingPath} <<'NODE'\n${authPhase}\nNODE`,
    ]);
    const authReport = parseJson(authRaw, 'Auth phase');
    kubectl(['cp', `${authPod}:${remoteMappingPath}`, localMappingPath], { stdio: ['pipe', 'ignore', 'pipe'] });
    kubectl(['exec', authDeployment, '--', 'rm', '-f', remoteStatsPath, remoteMappingPath], { stdio: ['pipe', 'ignore', 'pipe'] });

    kubectl(['cp', localMappingPath, `${marathonPod}:${remoteMappingPath}`], { stdio: ['pipe', 'ignore', 'pipe'] });
    const marathonRaw = kubectl([
      'exec',
      marathonDeployment,
      '--',
      'sh',
      '-lc',
      `set -e\ncd /app\nRECONCILE_APPLY=${marathonNeedsApply ? 'true' : 'false'} node - ${remoteMappingPath} <<'NODE'\n${marathonPhase}\nNODE\nrm -f ${remoteMappingPath}`,
    ]);
    const marathonReport = parseJson(marathonRaw, 'Marathon phase');

    console.log(JSON.stringify({
      ok: true,
      mode: apply ? 'apply' : 'dry-run',
      phase: apply ? phase : 'dry-run',
      applyAllowed: apply,
      ticket: apply ? '[set]' : null,
      outputPolicy: {
        aggregateCountsOnly: true,
        rawUserIds: false,
        rawEmails: false,
        rawPhones: false,
        secrets: false,
      },
      collector,
      auth: authReport,
      marathon: marathonReport,
      caveats: [
        'No roles are removed by this helper.',
        'UUID-like MarathonParticipant.userId rows are not changed by this helper.',
        'One numeric legacy id without mapping remains outside the mapped correction set.',
      ],
    }, null, 2));
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});
