#!/usr/bin/env node
/*
 * Dry-run Marathon/Auth legacy identity reconciliation.
 *
 * This script is intentionally read-only:
 * - no DB writes
 * - no Auth API writes
 * - no raw emails, phones, names, JWTs, DB URLs, or user IDs in output
 * - temporary user-id statistics are copied only between local /tmp and pods,
 *   then removed.
 *
 * Run from the Alfares host where kubectl can reach statex-apps:
 *   node scripts/dry-run-marathon-auth-reconciliation.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const namespace = process.env.K8S_NAMESPACE || 'statex-apps';
const marathonDeployment = process.env.MARATHON_DEPLOYMENT || 'deployment/marathon';
const authDeployment = process.env.AUTH_DEPLOYMENT || 'deployment/auth-microservice';

if (process.argv.includes('--apply')) {
  console.error(JSON.stringify({
    ok: false,
    error: 'apply is intentionally not implemented; this script is dry-run only',
  }));
  process.exit(1);
}

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

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON`);
  }
}

function printPlanOnly() {
  console.log(JSON.stringify({
    ok: true,
    mode: 'plan-only',
    liveAccess: false,
    dbAccess: false,
    authDbAccess: false,
    applyAllowed: false,
    dryRunCommand: 'node scripts/dry-run-marathon-auth-reconciliation.js',
    outputPolicy: {
      aggregateCountsOnly: true,
      rawUserIds: false,
      rawEmails: false,
      rawPhones: false,
      secrets: false,
    },
    intendedCorrection: {
      marathonParticipantUserId: 'numeric legacy SpeakASAP user ids -> Auth UUID from legacy_identity_mappings',
      authMarker: 'perApplicationPreferences.authSources.marathon',
      authRole: 'app:marathon:user',
    },
    applyGate: 'separate owner-approved script/run required; not available in this dry-run tool',
  }, null, 2));
}

function extractEmbedded(fn) {
  const text = fn.toString();
  return text.slice(text.indexOf('/*') + 2, text.lastIndexOf('*/'));
}

const marathonCollector = extractEmbedded(function embeddedMarathonCollector() { /*
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureStat(map, key) {
  if (!map[key]) map[key] = { rows: 0, finishedRows: 0, activeRows: 0 };
  return map[key];
}

(async () => {
  const participants = await prisma.marathonParticipant.findMany({
    select: { id: true, userId: true, finishedAt: true, active: true },
  });
  const submissionParticipantIds = new Set(
    (await prisma.stepSubmission.findMany({ distinct: ["participantId"], select: { participantId: true } }))
      .map((row) => row.participantId),
  );

  const numeric = {};
  const uuidLike = {};
  const totals = {
    participants: participants.length,
    boundRows: 0,
    unboundRows: 0,
    numericRows: 0,
    uuidRows: 0,
    otherRows: 0,
    finishedRows: 0,
    finishedNumericRows: 0,
    activeNumericRows: 0,
    rowsWithSubmissions: 0,
    numericRowsWithSubmissions: 0,
  };

  for (const participant of participants) {
    if (participant.finishedAt) totals.finishedRows += 1;
    if (submissionParticipantIds.has(participant.id)) totals.rowsWithSubmissions += 1;

    const userId = participant.userId ? String(participant.userId) : "";
    if (!userId) {
      totals.unboundRows += 1;
      continue;
    }

    totals.boundRows += 1;
    if (/^\d+$/.test(userId)) {
      totals.numericRows += 1;
      if (participant.finishedAt) totals.finishedNumericRows += 1;
      if (participant.active) totals.activeNumericRows += 1;
      if (submissionParticipantIds.has(participant.id)) totals.numericRowsWithSubmissions += 1;
      const stat = ensureStat(numeric, userId);
      stat.rows += 1;
      if (participant.finishedAt) stat.finishedRows += 1;
      if (participant.active) stat.activeRows += 1;
    } else if (uuid.test(userId)) {
      totals.uuidRows += 1;
      const stat = ensureStat(uuidLike, userId);
      stat.rows += 1;
      if (participant.finishedAt) stat.finishedRows += 1;
      if (participant.active) stat.activeRows += 1;
    } else {
      totals.otherRows += 1;
    }
  }

  const duplicateUserLanguageGroups = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT p."userId", m."languageCode", COUNT(*)
      FROM "MarathonParticipant" p
      JOIN "Marathon" m ON m.id = p."marathonId"
      WHERE p."userId" IS NOT NULL
      GROUP BY p."userId", m."languageCode"
      HAVING COUNT(*) > 1
    ) grouped
  `;

  console.log(JSON.stringify({
    ok: true,
    totals,
    distinctNumericUserIds: Object.keys(numeric).length,
    distinctUuidUserIds: Object.keys(uuidLike).length,
    duplicateUserLanguageGroups: Number(duplicateUserLanguageGroups[0]?.count || 0),
    numeric,
    uuidLike,
  }));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
*/ });

const authAnalyzer = extractEmbedded(function embeddedAuthAnalyzer() { /*
const fs = require("fs");
const { Client } = require("pg");

const statsPath = process.argv[2];
const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
const numericStats = stats.numeric || {};
const uuidStats = stats.uuidLike || {};
const numericIds = Object.keys(numericStats).map(Number);
const uuidIds = Object.keys(uuidStats);

function sumRows(keys, source) {
  return keys.reduce((sum, key) => sum + Number(source[String(key)]?.rows || 0), 0);
}

function countDuplicateTargets(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (!row.authUserId) continue;
    counts.set(row.authUserId, (counts.get(row.authUserId) || 0) + 1);
  }
  let duplicateTargets = 0;
  for (const count of counts.values()) {
    if (count > 1) duplicateTargets += 1;
  }
  return duplicateTargets;
}

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  await client.connect();
  const q = async (text, params = []) => (await client.query(text, params)).rows;

  const authSummary = await q(
    `SELECT COUNT(*)::int AS users,
            COUNT(*) FILTER (WHERE source = $1)::int AS source_marathon,
            COUNT(*) FILTER (WHERE jsonb_extract_path("perApplicationPreferences", $2, $1) IS NOT NULL)::int AS marked_marathon,
            COUNT(*) FILTER (WHERE source = $3)::int AS source_speakasap_portal
       FROM users`,
    ["marathon", "authSources", "speakasap-portal"],
  );

  const marathonRole = await q(
    `SELECT a.id AS "applicationId", r.id AS "roleId", r.name, COUNT(ur.id)::int AS assignments
       FROM applications a
       LEFT JOIN roles r ON r."applicationId" = a.id AND r.scope = $2 AND r.name = $3
       LEFT JOIN user_roles ur ON ur."roleId" = r.id
      WHERE a.name = $1
      GROUP BY a.id, r.id, r.name`,
    ["marathon", "application", "user"],
  );

  const mappingRows = numericIds.length
    ? await q(
        `SELECT "legacyUserId", "authUserId", status
           FROM legacy_identity_mappings
          WHERE "legacySystem" = $1
            AND "legacyUserId" = ANY($2::int[])`,
        ["speakasap-portal", numericIds],
      )
    : [];

  const mappedLegacyIds = new Set(mappingRows.map((row) => Number(row.legacyUserId)));
  const mappedWithAuthRows = mappingRows.filter((row) => row.authUserId);
  const mappedWithAuthLegacyIds = new Set(mappedWithAuthRows.map((row) => Number(row.legacyUserId)));
  const missingNumericIds = numericIds.filter((legacyId) => !mappedLegacyIds.has(legacyId));
  const noAuthMappingIds = numericIds.filter((legacyId) => mappedLegacyIds.has(legacyId) && !mappedWithAuthLegacyIds.has(legacyId));
  const mappedAuthIds = Array.from(new Set(mappedWithAuthRows.map((row) => row.authUserId).filter(Boolean)));

  const mappedAuthRoleSummary = mappedAuthIds.length
    ? await q(
        `SELECT COUNT(DISTINCT u.id)::int AS users,
                COUNT(DISTINCT u.id) FILTER (WHERE u.source = $2)::int AS source_marathon,
                COUNT(DISTINCT u.id) FILTER (WHERE jsonb_extract_path(u."perApplicationPreferences", $3, $2) IS NOT NULL)::int AS marked_marathon,
                COUNT(DISTINCT u.id) FILTER (WHERE r.scope = $4 AND a.name = $2 AND r.name = $5)::int AS users_with_marathon_user_role,
                COUNT(ur.id) FILTER (WHERE r.scope = $6)::int AS global_roles,
                COUNT(ur.id) FILTER (WHERE r.scope = $4 AND COALESCE(a.name, $7) <> $2)::int AS other_app_roles,
                COUNT(ur.id) FILTER (WHERE r.scope = $8)::int AS internal_roles
           FROM users u
           LEFT JOIN user_roles ur ON ur."userId" = u.id
           LEFT JOIN roles r ON r.id = ur."roleId"
           LEFT JOIN applications a ON a.id = ur."applicationId"
          WHERE u.id = ANY($1::uuid[])`,
        [mappedAuthIds, "marathon", "authSources", "application", "user", "global", "", "internal"],
      )
    : [{ users: 0, source_marathon: 0, marked_marathon: 0, marathon_user_role_assignments: 0, users_with_marathon_user_role: 0, global_roles: 0, other_app_roles: 0, internal_roles: 0 }];

  const existingUuidRows = uuidIds.length
    ? await q(
        `SELECT id, source,
                jsonb_extract_path("perApplicationPreferences", $2, $3) IS NOT NULL AS "markedMarathon"
           FROM users
          WHERE id = ANY($1::uuid[])`,
        [uuidIds, "authSources", "marathon"],
      )
    : [];
  const existingUuidIds = new Set(existingUuidRows.map((row) => row.id));
  const missingUuidIds = uuidIds.filter((id) => !existingUuidIds.has(id));

  const statusCounts = {};
  for (const row of mappingRows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const mappedRows = Array.from(mappedWithAuthLegacyIds);
  const correctionPlan = {
    participantUserIdRewrites: {
      candidateRows: stats.totals.numericRows,
      candidateDistinctLegacyIds: numericIds.length,
      mappedDistinctLegacyIds: mappedWithAuthLegacyIds.size,
      mappedParticipantRows: sumRows(mappedRows, numericStats),
      missingMappingDistinctLegacyIds: missingNumericIds.length,
      missingMappingParticipantRows: sumRows(missingNumericIds, numericStats),
      mappingWithoutAuthUserDistinctLegacyIds: noAuthMappingIds.length,
      mappingWithoutAuthUserParticipantRows: sumRows(noAuthMappingIds, numericStats),
      duplicateTargetAuthUsers: countDuplicateTargets(mappedWithAuthRows),
      statusCounts,
    },
    authMarathonAccess: {
      targetDistinctAuthUsers: mappedAuthIds.length,
      usersAlreadySourceMarathon: Number(mappedAuthRoleSummary[0]?.source_marathon || 0),
      usersAlreadyMarkedMarathon: Number(mappedAuthRoleSummary[0]?.marked_marathon || 0),
      usersWithMarathonUserRole: Number(mappedAuthRoleSummary[0]?.users_with_marathon_user_role || 0),
      missingMarathonUserRoleAssignments: Math.max(0, mappedAuthIds.length - Number(mappedAuthRoleSummary[0]?.users_with_marathon_user_role || 0)),
      globalRolesOnTargets: Number(mappedAuthRoleSummary[0]?.global_roles || 0),
      otherAppRolesOnTargets: Number(mappedAuthRoleSummary[0]?.other_app_roles || 0),
      internalRolesOnTargets: Number(mappedAuthRoleSummary[0]?.internal_roles || 0),
      marathonApplicationRoleExists: Boolean(marathonRole[0]?.roleId),
      marathonUserRoleAssignmentsTotal: Number(marathonRole[0]?.assignments || 0),
    },
    uuidParticipantRows: {
      candidateRows: stats.totals.uuidRows,
      distinctUuidUserIds: uuidIds.length,
      existingAuthUsers: existingUuidIds.size,
      missingAuthUsers: missingUuidIds.length,
      existingAuthUserRows: sumRows(Array.from(existingUuidIds), uuidStats),
      missingAuthUserRows: sumRows(missingUuidIds, uuidStats),
      existingSourceMarathonUsers: existingUuidRows.filter((row) => row.source === "marathon").length,
      existingMarkedMarathonUsers: existingUuidRows.filter((row) => row.markedMarathon).length,
    },
  };

  console.log(JSON.stringify({
    ok: true,
    mode: "dry-run",
    liveAccess: true,
    dbAccess: "read-only aggregate queries through deployed pods",
    outputPolicy: {
      aggregateCountsOnly: true,
      rawUserIds: false,
      rawEmails: false,
      rawPhones: false,
      secrets: false,
    },
    marathon: {
      totals: stats.totals,
      distinctNumericUserIds: stats.distinctNumericUserIds,
      distinctUuidUserIds: stats.distinctUuidUserIds,
      duplicateUserLanguageGroups: stats.duplicateUserLanguageGroups,
    },
    auth: {
      summary: authSummary[0],
      marathonUserRole: marathonRole[0] || null,
    },
    correctionPlan,
    applyAllowed: false,
    nextApplyGate: [
      "owner approval for Marathon DB userId rewrite",
      "owner approval for Auth DB app:marathon:user assignment and authSources.marathon marker update",
      "rollback/forward-fix policy and exact runtime context",
    ],
  }, null, 2));
})()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message, code: error.code || null }));
    process.exit(1);
  })
  .finally(() => client.end());
*/ });

async function main() {
  if (process.argv.includes('--plan-only')) {
    printPlanOnly();
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marathon-auth-reconcile-'));
  const localStatsPath = path.join(tempDir, 'marathon-userid-stats.json');
  const remoteStatsPath = `/tmp/marathon-userid-stats-${process.pid}.json`;

  try {
    const marathonRaw = kubectl([
      'exec',
      marathonDeployment,
      '--',
      'sh',
      '-lc',
      `cd /app && node - <<'NODE'\n${marathonCollector}\nNODE`,
    ]);
    const marathonStats = parseJson(marathonRaw, 'Marathon collector');
    if (!marathonStats.ok) {
      throw new Error('Marathon collector failed');
    }

    fs.writeFileSync(localStatsPath, JSON.stringify({
      totals: marathonStats.totals,
      distinctNumericUserIds: marathonStats.distinctNumericUserIds,
      distinctUuidUserIds: marathonStats.distinctUuidUserIds,
      duplicateUserLanguageGroups: marathonStats.duplicateUserLanguageGroups,
      numeric: marathonStats.numeric,
      uuidLike: marathonStats.uuidLike,
    }));

    const authPod = kubectl([
      'get',
      'pod',
      '-l',
      'app=auth-microservice',
      '-o',
      'jsonpath={.items[0].metadata.name}',
    ]).trim();
    if (!authPod) {
      throw new Error('Auth pod not found');
    }

    kubectl(['cp', localStatsPath, `${authPod}:${remoteStatsPath}`], { stdio: ['pipe', 'ignore', 'pipe'] });
    const reportRaw = kubectl([
      'exec',
      authDeployment,
      '--',
      'sh',
      '-lc',
      `cd /app && node - ${remoteStatsPath} <<'NODE'\n${authAnalyzer}\nNODE\nrm -f ${remoteStatsPath}`,
    ]);

    const report = parseJson(reportRaw, 'Auth analyzer');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup only.
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});
