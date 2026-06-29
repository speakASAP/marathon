#!/usr/bin/env node
/**
 * Read-only assignment block contract auditor for active Marathon catalog rows.
 *
 * The report is intentionally aggregate-only. It does not print assignment text,
 * field labels, report payloads, participant data, payment data, tokens, or secrets.
 */

const SUPPORTED_PERSISTED_TYPES = new Set(['text', 'video', 'audio', 'image', 'link', 'field']);
const RENDERER_DERIVED_TYPES = new Set(['quote', 'list', 'knownWords']);
const SUPPORTED_FIELD_TYPES = new Set(['text', 'textarea', 'radio', 'checkbox']);
const SUPPORTED_ANSWER_SIZES = new Set(['short', 'long']);
const DOWNLOAD_FILE_HREF = /\.(?:pdf|zip|docx?|xlsx?|pptx?|mp3|mp4|wav|ogg)(?:[?#]|$)/i;
const REQUIRED_TEXT_MIN_LENGTH = 2;
const GENERIC_NEXT_SCHEDULE_INSTRUCTION = /Сформируйте отчет[,.]?\s*Новый этап появится в то\s*(?:⏰\s*)?время,\s*которое вы указали на странице(?:\s*⚙️?)?(?:\s*настроек\.?)?/i;

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

const TERMINAL_PUNCTUATION_PATTERN = /[.!?…:;]["')\]»”]*$/u;
const TRAILING_TRANSLATION_PATTERN = /\s+(\([^()]+\))$/u;

function hasTerminalPunctuation(value) {
  const text = String(value || '').trim();
  if (TERMINAL_PUNCTUATION_PATTERN.test(text)) return true;
  return TERMINAL_PUNCTUATION_PATTERN.test(text.replace(TRAILING_TRANSLATION_PATTERN, ''));
}

function ensureTerminalPunctuation(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || !/\p{L}/u.test(text) || hasTerminalPunctuation(text)) return text;
  const translation = text.match(TRAILING_TRANSLATION_PATTERN);
  if (translation) return `${text.slice(0, translation.index).trim()}. ${translation[1]}`;
  return `${text}.`;
}

function auditDisplayedText(value, aggregate) {
  if (!hasText(value) || !/\p{L}/u.test(String(value))) return;
  aggregate.terminalPunctuationTextCount += 1;
  if (!hasTerminalPunctuation(value)) aggregate.terminalPunctuationNormalizedCount += 1;
  if (!hasTerminalPunctuation(ensureTerminalPunctuation(value))) {
    aggregate.terminalPunctuationIssueCount += 1;
  }
}

function isDownloadHref(value) {
  return typeof value === 'string' && DOWNLOAD_FILE_HREF.test(value.trim());
}

function isGenericSettingsLink(block) {
  return isRecord(block)
    && block.type === 'link'
    && /^настроек\.?$/i.test(String(block.text || '').trim())
    && /^\/profile\/?(?:[?#].*)?$/i.test(String(block.href || '').trim());
}

function hasTemplateHref(value) {
  return typeof value === 'string' && /\{%|%\}|^\{%(?:host_)?url/i.test(value.trim());
}

function validInlineLinks(value) {
  if (value == null) return true;
  return Array.isArray(value)
    && value.every((link) => isRecord(link) && hasText(link.text) && hasText(link.href) && !hasTemplateHref(link.href));
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
      image: 0,
    },
    requiredFieldCount: 0,
    effectiveRequiredFieldCount: 0,
    promotedRequiredFieldStepCount: 0,
    stepsWithoutRequiredFields: 0,
    missingBlockTypeCount: 0,
    unsupportedBlockTypeCount: 0,
    malformedBlockCount: 0,
    invalidSupportedBlockCount: 0,
    genericInstructionCount: 0,
    genericSettingsLinkCount: 0,
    invalidDownloadLinkCount: 0,
    terminalPunctuationTextCount: 0,
    terminalPunctuationNormalizedCount: 0,
    terminalPunctuationIssueCount: 0,
    violations: [],
    warnings: [],
  };
}

function validateSupportedBlock(block, aggregate) {
  if (block.type === 'text') {
    if (!hasText(block.text) || !validInlineLinks(block.links)) aggregate.invalidSupportedBlockCount += 1;
    auditDisplayedText(block.text, aggregate);
    if (GENERIC_NEXT_SCHEDULE_INSTRUCTION.test(String(block.text || ''))) {
      aggregate.genericInstructionCount += 1;
    }
    return;
  }

  if (block.type === 'video') {
    aggregate.mediaCounts.video += 1;
    aggregate.mediaCounts.total += 1;
    if (!hasText(block.code)) aggregate.invalidSupportedBlockCount += 1;
    auditDisplayedText(block.title, aggregate);
    return;
  }

  if (block.type === 'audio') {
    aggregate.mediaCounts.audio += 1;
    aggregate.mediaCounts.total += 1;
    if (!hasText(block.code)) aggregate.invalidSupportedBlockCount += 1;
    auditDisplayedText(block.title, aggregate);
    return;
  }

  if (block.type === 'image') {
    aggregate.mediaCounts.image += 1;
    aggregate.mediaCounts.total += 1;
    if (!hasText(block.src) || hasTemplateHref(block.src)) aggregate.invalidSupportedBlockCount += 1;
    auditDisplayedText(block.caption, aggregate);
    return;
  }

  if (block.type === 'link') {
    if (!hasText(block.href) || !hasText(block.text) || hasTemplateHref(block.href)) aggregate.invalidSupportedBlockCount += 1;
    if (block.download === true && !isDownloadHref(block.href)) {
      aggregate.invalidDownloadLinkCount += 1;
    }
    if (isGenericSettingsLink(block)) {
      aggregate.genericSettingsLinkCount += 1;
    }
    return;
  }

  if (block.type === 'field') {
    aggregate.fieldCounts.total += 1;
    countInto(aggregate.fieldCounts.byFieldType, block.fieldType || 'missing');
    if (block.required !== false) aggregate.requiredFieldCount += 1;
    if (!hasText(block.name) || !hasText(block.label)) {
      aggregate.invalidSupportedBlockCount += 1;
    }
    auditDisplayedText(block.label, aggregate);
    auditDisplayedText(block.hint, aggregate);
    if (block.fieldType != null && !SUPPORTED_FIELD_TYPES.has(block.fieldType)) {
      aggregate.invalidSupportedBlockCount += 1;
    }
    if (block.answerSize != null && !SUPPORTED_ANSWER_SIZES.has(block.answerSize)) {
      aggregate.invalidSupportedBlockCount += 1;
    }
  }
}

function auditStepBlocks(step, aggregate) {
  const blocks = Array.isArray(step.assignmentBlocks) ? step.assignmentBlocks : [];
  const invalidCountBeforeStep = aggregate.invalidSupportedBlockCount;
  const requiredFieldCountBeforeStep = aggregate.requiredFieldCount;
  const fieldCountBeforeStep = aggregate.fieldCounts.total;
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
  if (aggregate.terminalPunctuationIssueCount > 0) {
    aggregate.violations.push({ code: 'terminal-punctuation', sequence: step.sequence });
  }
  if (blocks.some((block) => isRecord(block) && block.type === 'text' && GENERIC_NEXT_SCHEDULE_INSTRUCTION.test(String(block.text || '')))) {
    aggregate.violations.push({ code: 'generic-next-schedule-instruction', sequence: step.sequence });
  }
  if (blocks.some(isGenericSettingsLink)) {
    aggregate.violations.push({ code: 'generic-settings-link', sequence: step.sequence });
  }
  if (blocks.some((block) => isRecord(block) && block.type === 'link' && block.download === true && !isDownloadHref(block.href))) {
    aggregate.violations.push({ code: 'non-file-download-link', sequence: step.sequence });
  }
  const stepFieldCount = aggregate.fieldCounts.total - fieldCountBeforeStep;
  const stepRawRequiredFieldCount = aggregate.requiredFieldCount - requiredFieldCountBeforeStep;
  if (stepRawRequiredFieldCount > 0) {
    aggregate.effectiveRequiredFieldCount += stepRawRequiredFieldCount;
  } else if (stepFieldCount > 0) {
    aggregate.effectiveRequiredFieldCount += 1;
    aggregate.promotedRequiredFieldStepCount += 1;
    aggregate.warnings.push({ code: 'required-field-promoted-by-contract', sequence: step.sequence });
  } else {
    aggregate.stepsWithoutRequiredFields += 1;
    aggregate.violations.push({ code: 'missing-required-field', sequence: step.sequence });
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

    if (aggregate.genericInstructionCount > 0) {
      checks.push({
        status: 'fail',
        code: 'generic-next-schedule-instruction',
        message: `${label} still has ${aggregate.genericInstructionCount} generic next-schedule instruction block(s).`,
      });
    } else {
      checks.push({ status: 'pass', code: 'generic-next-schedule-instruction', message: `${label} has no generic next-schedule instruction blocks.` });
    }

    if (aggregate.genericSettingsLinkCount > 0) {
      checks.push({
        status: 'fail',
        code: 'generic-settings-link',
        message: `${label} still has ${aggregate.genericSettingsLinkCount} generic settings link(s).`,
      });
    } else {
      checks.push({ status: 'pass', code: 'generic-settings-link', message: `${label} has no generic settings links.` });
    }

    if (aggregate.invalidDownloadLinkCount > 0) {
      checks.push({
        status: 'fail',
        code: 'non-file-download-link',
        message: `${label} has ${aggregate.invalidDownloadLinkCount} navigation link(s) marked as downloads.`,
      });
    } else {
      checks.push({ status: 'pass', code: 'non-file-download-link', message: `${label} has no navigation links marked as downloads.` });
    }

    if (aggregate.stepsWithoutRequiredFields > 0) {
      checks.push({
        status: 'fail',
        code: 'required-report-fields',
        message: `${label} has ${aggregate.stepsWithoutRequiredFields} step(s) without any required report field.`,
      });
    } else {
      checks.push({ status: 'pass', code: 'required-report-fields', message: `${label} has at least one required report field on every step.` });
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

    if (aggregate.terminalPunctuationIssueCount > 0) {
      checks.push({
        status: 'fail',
        code: 'terminal-punctuation',
        message: `${label} has ${aggregate.terminalPunctuationIssueCount} displayed assignment text item(s) without terminal punctuation after normalization.`,
      });
    } else {
      checks.push({
        status: 'pass',
        code: 'terminal-punctuation',
        message: `${label} displayed assignment text has terminal punctuation after normalization.`,
      });
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
      requiredTextMinLength: REQUIRED_TEXT_MIN_LENGTH,
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
    requiredTextMinLength: REQUIRED_TEXT_MIN_LENGTH,
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
  console.log(`Required text minimum length: ${report.requiredTextMinLength}`);
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
    console.log(`  effectiveRequiredFieldCount: ${marathon.effectiveRequiredFieldCount}`);
    console.log(`  promotedRequiredFieldStepCount: ${marathon.promotedRequiredFieldStepCount}`);
    console.log(`  stepsWithoutRequiredFields: ${marathon.stepsWithoutRequiredFields}`);
    console.log(`  missingBlockTypeCount: ${marathon.missingBlockTypeCount}`);
    console.log(`  unsupportedBlockTypeCount: ${marathon.unsupportedBlockTypeCount}`);
    console.log(`  malformedBlockCount: ${marathon.malformedBlockCount}`);
    console.log(`  invalidSupportedBlockCount: ${marathon.invalidSupportedBlockCount}`);
    console.log(`  genericInstructionCount: ${marathon.genericInstructionCount}`);
    console.log(`  genericSettingsLinkCount: ${marathon.genericSettingsLinkCount}`);
    console.log(`  invalidDownloadLinkCount: ${marathon.invalidDownloadLinkCount}`);
    console.log(`  terminalPunctuationTextCount: ${marathon.terminalPunctuationTextCount}`);
    console.log(`  terminalPunctuationNormalizedCount: ${marathon.terminalPunctuationNormalizedCount}`);
    console.log(`  terminalPunctuationIssueCount: ${marathon.terminalPunctuationIssueCount}`);
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
