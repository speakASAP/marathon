#!/usr/bin/env node
/**
 * Create an intentionally incomplete catalog-only draft from legacy fixture data.
 *
 * The output is for source-owner review, not import. It maps only marathon and
 * step structure, leaves assignmentContent blank, creates no products/gifts,
 * and marks every marathon inactive so the current loader cannot accidentally
 * treat the result as launch-ready.
 */

const fs = require('fs');
const path = require('path');

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  node scripts/draft-legacy-marathon-catalog.js --fixture <marathon.json> [--marathon-pk <id,id>] [--output <catalog-draft.json>]',
    '',
    'Creates an intentionally incomplete catalog-only JSON draft for source-owner',
    'review. The draft still requires approved language codes, active launch',
    'state, assignmentContent, products, gift codes, and source-owner approval',
    'before it can be loaded.',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage(0);

  const options = { fixture: '', marathonPks: null, output: '' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--fixture') {
      options.fixture = args[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--marathon-pk') {
      const value = args[index + 1] || '';
      options.marathonPks = new Set(value.split(',').map((item) => item.trim()).filter(Boolean));
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = args[index + 1] || '';
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!options.fixture) usage(1);
  return options;
}

function readFixture(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(records)) {
    throw new Error('Fixture must be a JSON array');
  }
  return records;
}

function cleanString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function normalizeInteger(value, fallback) {
  if (Number.isInteger(value)) return value;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function slugForMarathon(record) {
  const fields = record.fields || {};
  const folder = cleanString(fields.folder) || 'legacy';
  return `${folder}-${record.pk}`;
}

function languageCodeForMarathon(record) {
  const fields = record.fields || {};
  return cleanString(fields.folder) || `legacy-${cleanString(fields.language) || record.pk}`;
}

function buildDraft(records, options) {
  const marathons = records.filter((record) => record.model === 'marathon.marathon');
  const steps = records.filter((record) => record.model === 'marathon.step');
  const stepsByMarathonPk = new Map();

  for (const step of steps) {
    const marathonPk = cleanString(step.fields?.marathon);
    if (!stepsByMarathonPk.has(marathonPk)) stepsByMarathonPk.set(marathonPk, []);
    stepsByMarathonPk.get(marathonPk).push(step);
  }

  const selectedMarathons = marathons
    .filter((record) => !options.marathonPks || options.marathonPks.has(cleanString(record.pk)))
    .sort((a, b) => normalizeInteger(a.pk, 0) - normalizeInteger(b.pk, 0));

  if (!selectedMarathons.length) {
    throw new Error('No marathon records matched the requested selection');
  }

  return {
    marathons: selectedMarathons.map((record) => {
      const fields = record.fields || {};
      const marathonSteps = (stepsByMarathonPk.get(cleanString(record.pk)) || [])
        .slice()
        .sort((a, b) => normalizeInteger(a.fields?.order, 0) - normalizeInteger(b.fields?.order, 0));

      return {
        active: false,
        languageCode: languageCodeForMarathon(record),
        slug: slugForMarathon(record),
        title: cleanString(fields.title),
        coverImageUrl: cleanString(fields.image) || undefined,
        landingVideoUrl: cleanString(fields.landing_video) || undefined,
        rulesTemplate: cleanString(fields.rules_template) || undefined,
        paymentStartsAt: cleanString(fields.payment_since) || undefined,
        steps: marathonSteps.map((step) => {
          const stepFields = step.fields || {};
          return {
            assignmentContent: '',
            formKey: cleanString(stepFields.form_class) || undefined,
            isPenalized: normalizeBoolean(stepFields.penalize, true),
            isTrialStep: normalizeBoolean(stepFields.trial, false),
            sequence: normalizeInteger(stepFields.order, 0),
            socialLink: cleanString(stepFields.sn_link) || undefined,
            title: cleanString(stepFields.title),
          };
        }),
      };
    }).map(removeUndefined),
    products: [],
    gifts: [],
  };
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value).reduce((result, [key, entry]) => {
    if (entry !== undefined) result[key] = removeUndefined(entry);
    return result;
  }, {});
}

function summarizeDraft(draft, source) {
  const stepCount = draft.marathons.reduce((total, marathon) => total + marathon.steps.length, 0);
  const trialCount = draft.marathons.reduce(
    (total, marathon) => total + marathon.steps.filter((step) => step.isTrialStep).length,
    0,
  );

  return {
    source,
    marathons: draft.marathons.length,
    activeMarathons: draft.marathons.filter((marathon) => marathon.active).length,
    steps: stepCount,
    trialSteps: trialCount,
    gatedSteps: stepCount - trialCount,
    products: draft.products.length,
    gifts: draft.gifts.length,
    stepsWithAssignmentContent: draft.marathons.reduce(
      (total, marathon) => total + marathon.steps.filter((step) => step.assignmentContent.trim()).length,
      0,
    ),
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const source = path.resolve(options.fixture);
  const draft = buildDraft(readFixture(source), options);
  const content = `${JSON.stringify(draft, null, 2)}\n`;
  if (options.output) {
    fs.writeFileSync(options.output, content, { mode: 0o600 });
    const summary = summarizeDraft(draft, source);
    process.stdout.write(`${JSON.stringify({ output: path.resolve(options.output), summary }, null, 2)}\n`);
    return;
  }
  process.stdout.write(content);
}

main().catch((error) => {
  process.stderr.write(`Legacy catalog draft failed: ${error.message}\n`);
  process.exit(1);
});
