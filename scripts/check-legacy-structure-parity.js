#!/usr/bin/env node
/**
 * Read-only legacy structure parity auditor.
 * Compares legacy Django Marathon templates with current persisted assignmentBlocks.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_LEGACY_ROOT = '/home/ssf/Documents/Github/speakasap-portal';
const LANGUAGE_FOLDERS = {
  cz: 'czech', cs: 'czech', da: 'danish', de: 'german', dk: 'danish', en: 'english', es: 'spanish', fr: 'french', it: 'italian',
  nb: 'norwegian', nl: 'dutch', nn: 'norwegian', no: 'norwegian', pl: 'polish', pt: 'portuguese', se: 'swedish', sv: 'swedish', tr: 'turkish',
};

function hasArg(name) { return process.argv.slice(2).includes(name); }
function argValue(name, fallback = '') {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] || fallback) : fallback;
}
function isRecord(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function countMatches(text, pattern) { return Array.from(String(text || '').matchAll(pattern)).length; }
function countInto(target, key, by = 1) { target[key] = (target[key] || 0) + by; }
function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }

function walkBlocks(blocks, visitor) {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    visitor(block);
    if (block.type === 'list' && Array.isArray(block.items)) {
      for (const item of block.items) {
        if (isRecord(item) && Array.isArray(item.blocks)) walkBlocks(item.blocks, visitor);
      }
    }
  }
}

function countInlineRuns(content, result) {
  for (const run of Array.isArray(content) ? content : []) {
    if (!isRecord(run)) continue;
    result.inlineRuns += 1;
    if (Array.isArray(run.marks) && run.marks.length) result.emphasisRuns += 1;
    if (run.tone) result.toneRuns += 1;
    if (run.href) result.contentLinks += 1;
  }
}

function countCurrentMarkers(blocks) {
  const result = {
    blocks: Array.isArray(blocks) ? blocks.length : 0,
    blockTypes: {},
    listBlocks: 0,
    orderedLists: 0,
    unorderedLists: 0,
    listItems: 0,
    radioBlocks: 0,
    radioStations: 0,
    inlineRuns: 0,
    emphasisRuns: 0,
    toneRuns: 0,
    contentLinks: 0,
  };
  walkBlocks(blocks, (block) => {
    countInto(result.blockTypes, typeof block.type === 'string' ? block.type : 'malformed');
    if (block.type === 'list') {
      result.listBlocks += 1;
      if (block.ordered === true) result.orderedLists += 1;
      else result.unorderedLists += 1;
      result.listItems += Array.isArray(block.items) ? block.items.length : 0;
      for (const item of Array.isArray(block.items) ? block.items : []) {
        if (isRecord(item)) countInlineRuns(item.content, result);
      }
    }
    if (block.type === 'radio') {
      result.radioBlocks += 1;
      result.radioStations += Array.isArray(block.stations) ? block.stations.length : 0;
    }
    countInlineRuns(block.content, result);
  });
  return result;
}

function legacyCounts(html) {
  return {
    ol: countMatches(html, /<ol\b/gi),
    ul: countMatches(html, /<ul\b/gi),
    li: countMatches(html, /<li\b/gi),
    radioTags: countMatches(html, /\{%\s*radio_[A-Za-z0-9_]+\s*%\}/g),
    renderFields: countMatches(html, /\{%\s*render_field\s+form\.[A-Za-z0-9_]+/g),
    boldTags: countMatches(html, /<(?:b|strong)\b/gi),
    emphasisTags: countMatches(html, /<(?:i|em)\b/gi),
    spanTags: countMatches(html, /<span\b/gi),
    mutedSpans: countMatches(html, /<span\b[^>]*class=["'][^"']*text-muted/gi),
    toneSpans: countMatches(html, /<[^>]+class=["'][^"']*(?:text-danger|text-alert)/gi),
    classAttrs: countMatches(html, /\bclass=["']/gi),
    styleAttrs: countMatches(html, /\bstyle=["']/gi),
  };
}

function legacyFolderForStep(step, marathon) {
  const fromSocialLink = String(step.socialLink || '').match(/\/marathon\/([^/?#]+)\/?/i);
  if (fromSocialLink) return fromSocialLink[1].toLowerCase();
  return LANGUAGE_FOLDERS[String(marathon.languageCode || '').toLowerCase()] || null;
}

function addViolation(stepReport, code, expected, actual) {
  stepReport.violations.push({ code, expected, actual });
}

function auditStep(marathon, step, templatesRoot) {
  const folder = legacyFolderForStep(step, marathon);
  const relativeTemplate = folder && step.formKey ? path.join('marathon', 'templates', 'marathon', 'steps', folder, `${step.formKey}.html`) : '';
  const templatePath = folder && step.formKey ? path.join(templatesRoot, folder, `${step.formKey}.html`) : '';
  const exists = Boolean(templatePath && fs.existsSync(templatePath));
  const legacy = exists ? legacyCounts(fs.readFileSync(templatePath, 'utf8')) : null;
  const current = countCurrentMarkers(Array.isArray(step.assignmentBlocks) ? step.assignmentBlocks : []);
  const stepReport = { sequence: step.sequence, formKey: step.formKey, legacyTemplate: relativeTemplate, legacyTemplateExists: exists, legacy, current, violations: [] };

  if (step.formKey && !exists) {
    addViolation(stepReport, 'missing-legacy-template', { formKey: step.formKey }, { folder });
    return stepReport;
  }
  if (!legacy) return stepReport;

  if (legacy.li > 0 && current.listBlocks === 0) addViolation(stepReport, 'lost-list-structure', { li: legacy.li, ol: legacy.ol, ul: legacy.ul }, { listBlocks: current.listBlocks });
  if (legacy.ol > 0 && current.orderedLists === 0) addViolation(stepReport, 'lost-ordered-list-structure', { ol: legacy.ol }, { orderedLists: current.orderedLists });
  if (legacy.ul > 0 && current.unorderedLists === 0) addViolation(stepReport, 'lost-unordered-list-structure', { ul: legacy.ul }, { unorderedLists: current.unorderedLists });
  if (legacy.radioTags > 0 && current.radioBlocks === 0) addViolation(stepReport, 'lost-radio-widget', { radioTags: legacy.radioTags }, { radioBlocks: current.radioBlocks });
  if ((legacy.boldTags + legacy.emphasisTags) > 0 && current.emphasisRuns === 0) addViolation(stepReport, 'lost-inline-emphasis', { boldTags: legacy.boldTags, emphasisTags: legacy.emphasisTags }, { emphasisRuns: current.emphasisRuns });
  if ((legacy.mutedSpans + legacy.toneSpans) > 0 && current.toneRuns === 0) addViolation(stepReport, 'lost-inline-tone', { mutedSpans: legacy.mutedSpans, toneSpans: legacy.toneSpans }, { toneRuns: current.toneRuns });
  return stepReport;
}

function connectionFailureReport(error, legacyRoot) {
  return {
    ok: false,
    checkedAt: new Date().toISOString(),
    legacyRoot,
    activeMarathonCount: 0,
    stepCount: 0,
    summary: { violations: 1, stepsWithViolations: 0, listViolationSteps: 0, radioViolationSteps: 0, inlineViolationSteps: 0 },
    checks: [{ status: 'fail', code: 'database-connection', message: String(error?.message || error) }],
    marathons: [],
  };
}

function isDatabaseConnectionError(error) {
  const message = String(error?.message || error || '');
  return message.includes("Can't reach database server") || message.includes('P1001') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('getaddrinfo');
}

async function loadCurrentMarathons() {
  const currentJson = argValue('--current-json', '');
  if (currentJson) return JSON.parse(fs.readFileSync(currentJson, 'utf8'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    return await prisma.marathon.findMany({
      where: { active: true },
      orderBy: [{ languageCode: 'asc' }, { slug: 'asc' }],
      select: {
        languageCode: true,
        slug: true,
        steps: {
          orderBy: { sequence: 'asc' },
          select: { sequence: true, formKey: true, socialLink: true, assignmentBlocks: true },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function buildReport() {
  const legacyRoot = argValue('--legacy-root', DEFAULT_LEGACY_ROOT);
  const templatesRoot = path.join(legacyRoot, 'marathon', 'templates', 'marathon', 'steps');
  const focusSequence = argValue('--sequence', '');
  const focusFormKey = argValue('--form-key', '');
  const onlyViolations = hasArg('--violations-only');
  const marathons = await loadCurrentMarathons();
  const report = {
      ok: true,
      checkedAt: new Date().toISOString(),
      legacyRoot,
      activeMarathonCount: marathons.length,
      stepCount: 0,
      summary: { violations: 0, stepsWithViolations: 0, listViolationSteps: 0, radioViolationSteps: 0, inlineViolationSteps: 0 },
      checks: [],
      marathons: [],
  };
  for (const marathon of marathons) {
      const marathonReport = { languageCode: marathon.languageCode, slug: marathon.slug, folder: LANGUAGE_FOLDERS[String(marathon.languageCode || '').toLowerCase()] || null, steps: [] };
      for (const step of marathon.steps) {
        if (focusSequence && String(step.sequence) !== String(focusSequence)) continue;
        if (focusFormKey && step.formKey !== focusFormKey) continue;
        if (!hasText(step.formKey)) continue;
        const stepReport = auditStep(marathon, step, templatesRoot);
        report.stepCount += 1;
        if (stepReport.violations.length) {
          report.ok = false;
          report.summary.violations += stepReport.violations.length;
          report.summary.stepsWithViolations += 1;
          if (stepReport.violations.some((v) => v.code.includes('list'))) report.summary.listViolationSteps += 1;
          if (stepReport.violations.some((v) => v.code.includes('radio'))) report.summary.radioViolationSteps += 1;
          if (stepReport.violations.some((v) => v.code.includes('inline'))) report.summary.inlineViolationSteps += 1;
          for (const violation of stepReport.violations) {
            report.checks.push({ status: 'fail', code: violation.code, key: `${marathon.languageCode}/${marathon.slug}:${step.sequence}:${step.formKey}:${violation.code}`, message: `${marathon.languageCode}/${marathon.slug} step ${step.sequence} ${step.formKey || ''} has ${violation.code}`.trim() });
          }
        }
        if (!onlyViolations || stepReport.violations.length) marathonReport.steps.push(stepReport);
      }
      if (!onlyViolations || marathonReport.steps.length) report.marathons.push(marathonReport);
    }
  return report;
}

function printHuman(report) {
  console.log(`Legacy structure parity: ${report.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Checked at: ${report.checkedAt}`);
  console.log(`Legacy root: ${report.legacyRoot}`);
  console.log(`Active marathons: ${report.activeMarathonCount}`);
  console.log(`Steps checked: ${report.stepCount}`);
  console.log(`Violations: ${report.summary.violations}`);
  console.log(`Steps with violations: ${report.summary.stepsWithViolations}`);
  console.log(`List violation steps: ${report.summary.listViolationSteps}`);
  console.log(`Radio violation steps: ${report.summary.radioViolationSteps}`);
  console.log(`Inline violation steps: ${report.summary.inlineViolationSteps}`);
  if (report.checks.length) {
    console.log('');
    console.log('Checks:');
    for (const check of report.checks.slice(0, 80)) console.log(`- ${check.status.toUpperCase()} ${check.key || check.code}`);
    if (report.checks.length > 80) console.log(`... ${report.checks.length - 80} more`);
  }
}

const legacyRoot = argValue('--legacy-root', DEFAULT_LEGACY_ROOT);
buildReport().catch((error) => {
  if (isDatabaseConnectionError(error)) return connectionFailureReport(error, legacyRoot);
  throw error;
}).then((report) => {
  if (hasArg('--json')) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  process.exitCode = report.ok ? 0 : 1;
}).catch((error) => {
  console.error(`Legacy structure parity auditor failed: ${String(error?.message || error)}`);
  process.exitCode = 1;
});
