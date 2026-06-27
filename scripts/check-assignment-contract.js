#!/usr/bin/env node
/**
 * Read-only assignment block contract auditor for active Marathon catalog rows.
 *
 * The report is intentionally aggregate-only. It does not print assignment text,
 * field labels, report payloads, participant data, payment data, tokens, or secrets.
 */

const SUPPORTED_PERSISTED_TYPES = new Set(['text', 'video', 'audio', 'field']);
const RENDERER_DERIVED_TYPES = new Set(['quote', 'list', 'knownWords', 'link']);
const SUPPORTED_FIELD_TYPES = new Set(['text', 'textarea', 'radio', 'checkbox']);

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function countInto(target, key, by = 1) {
  const normalized = key || 'missing';
  target[normalized] = (target[normalized] || 0) + by;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDatabaseConnectionError(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes("Can't reach database server") ||
    message.includes('P1001') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('getaddrinfo')
  );
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

function createEmptyAggregate(marathon) {
  return {
    languageCode: marathon.languageCode,
    slug: marathon.slug,
    stepCount: marathon.steps.length,
    stepsWithAssignmentContent: 0,
    stepsWithAssignmentBlocks: 0,
    blockTypeCounts: {},
    rendererDerivedTypeCounts: {},
    fieldCounts: {
      total: 0,
      byFieldType: {},
    },
    mediaCounts: {
      total: 0,
      video: 0,
      audio: 0,
    },
    requiredFieldCount: 0,
    missingBlockTypeCount: 0,
    unsupportedBlockTypeCount: 0,
    malformedBlockCount: 0,
    invalidSupportedBlockCount: 0,
    violations: [],
    warnings: [],
  };
}

function validateSupportedBlock(block, aggregate) {
  if (block.type === 'text') {
    if (!hasText(block.text)) aggregate.invalidSupportedBlockCount += 1;
    return;
  }

  if (block.type === 'video') {
    aggregate.mediaCounts.video += 1;
    aggregate.mediaCounts.total += 1;
    if (!hasText(block.code)) aggregate.invalidSupportedBlockCount += 1;
    return;
  }

  if (block.type === 'audio') {
    aggregate.mediaCounts.audio += 1;
    aggregate.mediaCounts.total += 1;
    if (!hasText(block.code)) aggregate.invalidSupportedBlockCount += 1;
    return;
  }

  if (block.type === 'field') {
    aggregate.fieldCounts.total += 1;
    countInto(aggregate.fieldCounts.byFieldType, block.fieldType || 'missing');
    if (block.required !== false) aggregate.requiredFieldCount += 1;
    if (!hasText(block.name) || !hasText(block.label)) {
      aggregate.invalidSupportedBlockCount += 1;
    }
    if (block.fieldType != null && !SUPPORTED_FIELD_TYPES.has(block.fieldType)) {
      aggregate.invalidSupportedBlockCount += 1;
    }
  }
}

function auditStepBlocks(step, aggregate) {
  const blocks = Array.isArray(step.assignmentBlocks) ? step.assignmentBlocks : [];
  const invalidCountBeforeStep = aggregate.invalidSupportedBlockCount;
  if (hasText(step.assignmentContent)) aggregate.stepsWithAssignmentContent += 1;
  if (blocks.length > 0) aggregate.stepsWithAssignmentBlocks += 1;

  if (!hasText(step.assignmentContent)) {
    aggregate.violations.push({ code: 'missing-assignment-content', sequence: step.sequence });
  }

  if (blocks.length === 0) {
    aggregate.violations.push({ code: 'missing-assignment-blocks', sequence: step.sequence });
    return;
  }

  blocks.forEach((block, index) => {
    if (!isRecord(block)) {
      aggregate.malformedBlockCount += 1;
      aggregate.violations.push({ code: 'malformed-block', sequence: step.sequence, blockIndex: index });
      return;
    }

    if (!hasText(block.type)) {
      aggregate.missingBlockTypeCount += 1;
      aggregate.violations.push({ code: 'missing-block-type', sequence: step.sequence, blockIndex: index });
      return;
    }

    const type = block.type.trim();
    if (SUPPORTED_PERSISTED_TYPES.has(type)) {
      countInto(aggregate.blockTypeCounts, type);
      validateSupportedBlock({ ...block, type }, aggregate);
      return;
    }

    if (RENDERER_DERIVED_TYPES.has(type)) {
      countInto(aggregate.rendererDerivedTypeCounts, type);
      aggregate.warnings.push({ code: 'renderer-derived-type-persisted', sequence: step.sequence, blockIndex: index, type });
      return;
    }

    aggregate.unsupportedBlockTypeCount += 1;
    countInto(aggregate.blockTypeCounts, 'unsupported');
    aggregate.violations.push({ code: 'unsupported-block-type', sequence: step.sequence, blockIndex: index });
  });

  if (aggregate.invalidSupportedBlockCount > invalidCountBeforeStep) {
    aggregate.violations.push({ code: 'invalid-supported-block-shape', sequence: step.sequence });
  }
}

function summarizeMarathon(marathon) {
  const aggregate = createEmptyAggregate(marathon);
  marathon.steps.forEach((step) => auditStepBlocks(step, aggregate));
  return aggregate;
}

function buildContractChecks(activeCatalog, aggregates) {
  const checks = [];
  if (activeCatalog.length === 0) {
    checks.push({ status: 'fail', code: 'active-marathon', message: 'No active Marathon catalog rows found.' });
  }

  aggregates.forEach((aggregate) => {
    const label = `${aggregate.languageCode}/${aggregate.slug}`;
    if (aggregate.stepCount === 0) {
      checks.push({ status: 'fail', code: 'catalog-steps', message: `${label} has no MarathonStep rows.` });
      return;
    }

    if (aggregate.stepsWithAssignmentContent !== aggregate.stepCount) {
      checks.push({
        status: 'fail',
        code: 'assignment-content',
        message: `${label} has ${aggregate.stepCount - aggregate.stepsWithAssignmentContent} step(s) without assignmentContent.`,
      });
    } else {
      checks.push({ status: 'pass', code: 'assignment-content', message: `${label} has assignmentContent for every step.` });
    }

    if (aggregate.stepsWithAssignmentBlocks !== aggregate.stepCount) {
      checks.push({
        status: 'fail',
        code: 'assignment-blocks',
        message: `${label} has ${aggregate.stepCount - aggregate.stepsWithAssignmentBlocks} step(s) without non-empty assignmentBlocks.`,
      });
    } else {
      checks.push({ status: 'pass', code: 'assignment-blocks', message: `${label} has non-empty assignmentBlocks for every step.` });
    }

    if (aggregate.missingBlockTypeCount > 0 || aggregate.unsupportedBlockTypeCount > 0 || aggregate.malformedBlockCount > 0) {
      checks.push({
        status: 'fail',
        code: 'assignment-block-types',
        message:
          `${label} has malformed/missing/unsupported persisted assignment block types ` +
          `(malformed=${aggregate.malformedBlockCount}, missingType=${aggregate.missingBlockTypeCount}, unsupported=${aggregate.unsupportedBlockTypeCount}).`,
      });
    } else {
      checks.push({ status: 'pass', code: 'assignment-block-types', message: `${label} persisted block types are supported.` });
    }

    if (aggregate.invalidSupportedBlockCount > 0) {
      checks.push({
        status: 'fail',
        code: 'assignment-block-shape',
        message: `${label} has ${aggregate.invalidSupportedBlockCount} supported block(s) with invalid required fields.`,
      });
    } else {
      checks.push({ status: 'pass', code: 'assignment-block-shape', message: `${label} supported block shapes are valid.` });
    }

    const rendererDerivedCount = Object.values(aggregate.rendererDerivedTypeCounts).reduce((total, count) => total + count, 0);
    if (rendererDerivedCount > 0) {
      checks.push({
        status: 'warn',
        code: 'renderer-derived-types',
        message: `${label} has ${rendererDerivedCount} renderer-derived virtual block type(s) persisted; these are frontend-derived, not part of the persisted backend contract.`,
      });
    }
  });
  return checks;
}

async function buildReport() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const activeCatalog = await prisma.marathon.findMany({
      where: { active: true },
      orderBy: [{ languageCode: 'asc' }, { slug: 'asc' }],
      select: {
        languageCode: true,
        slug: true,
        steps: {
          orderBy: { sequence: 'asc' },
          select: {
            sequence: true,
            assignmentContent: true,
            assignmentBlocks: true,
          },
        },
      },
    });

    const aggregates = activeCatalog.map(summarizeMarathon);
    const checks = buildContractChecks(activeCatalog, aggregates);
    const ok = checks.every((check) => check.status !== 'fail');

    return {
      ok,
      checkedAt: new Date().toISOString(),
      supportedPersistedTypes: Array.from(SUPPORTED_PERSISTED_TYPES).sort(),
      rendererDerivedVirtualTypes: Array.from(RENDERER_DERIVED_TYPES).sort(),
      checks,
      marathons: aggregates,
    };
  } finally {
    await prisma.$disconnect();
  }
}

function buildConnectionFailureReport(error) {
  return {
    ok: false,
    checkedAt: new Date().toISOString(),
    supportedPersistedTypes: Array.from(SUPPORTED_PERSISTED_TYPES).sort(),
    rendererDerivedVirtualTypes: Array.from(RENDERER_DERIVED_TYPES).sort(),
    checks: [
      {
        status: 'fail',
        code: 'database-connection',
        message: 'Could not reach the Marathon database from this runtime.',
        detail: {
          databaseUrl: redactedDatabaseUrl(),
          error: String(error?.message || error),
          recommendation:
            'Run this auditor inside the deployed Marathon pod so cluster DNS and DATABASE_URL match production.',
          command:
            "kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:assignment-contract'",
        },
      },
    ],
    marathons: [],
  };
}

function printHuman(report) {
  console.log(`Assignment contract: ${report.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Checked at: ${report.checkedAt}`);
  console.log(`Supported persisted block types: ${report.supportedPersistedTypes.join(', ')}`);
  console.log(`Renderer-derived virtual types: ${report.rendererDerivedVirtualTypes.join(', ')}`);
  console.log('');
  console.log('Checks:');
  report.checks.forEach((check) => {
    console.log(`- ${check.status.toUpperCase()} ${check.code}: ${check.message}`);
    if (check.detail?.recommendation) console.log(`  recommendation: ${check.detail.recommendation}`);
    if (check.detail?.command) console.log(`  command: ${check.detail.command}`);
    if (check.detail?.databaseUrl) console.log(`  databaseUrl: ${check.detail.databaseUrl}`);
  });

  if (!report.marathons.length) return;

  console.log('');
  console.log('Active Marathon catalog aggregates:');
  report.marathons.forEach((marathon) => {
    console.log(`- ${marathon.languageCode}/${marathon.slug}`);
    console.log(`  stepCount: ${marathon.stepCount}`);
    console.log(`  stepsWithAssignmentContent: ${marathon.stepsWithAssignmentContent}`);
    console.log(`  stepsWithAssignmentBlocks: ${marathon.stepsWithAssignmentBlocks}`);
    console.log(`  blockTypeCounts: ${JSON.stringify(marathon.blockTypeCounts)}`);
    console.log(`  rendererDerivedTypeCounts: ${JSON.stringify(marathon.rendererDerivedTypeCounts)}`);
    console.log(`  fieldCounts: ${JSON.stringify(marathon.fieldCounts)}`);
    console.log(`  mediaCounts: ${JSON.stringify(marathon.mediaCounts)}`);
    console.log(`  requiredFieldCount: ${marathon.requiredFieldCount}`);
    console.log(`  missingBlockTypeCount: ${marathon.missingBlockTypeCount}`);
    console.log(`  unsupportedBlockTypeCount: ${marathon.unsupportedBlockTypeCount}`);
    console.log(`  malformedBlockCount: ${marathon.malformedBlockCount}`);
    console.log(`  invalidSupportedBlockCount: ${marathon.invalidSupportedBlockCount}`);
  });
}

async function main() {
  const jsonMode = hasArg('--json');
  let report;

  try {
    report = await buildReport();
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    report = buildConnectionFailureReport(error);
  }

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  process.exitCode = report.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(`Assignment contract auditor failed: ${String(error?.message || error)}`);
  process.exitCode = 1;
});
