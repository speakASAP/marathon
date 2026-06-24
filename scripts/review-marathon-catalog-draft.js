#!/usr/bin/env node
/**
 * Redacted review for in-progress Marathon catalog JSON.
 *
 * This is a source-owner completion aid, not an import path. It reads local
 * JSON and reports counts, missing fields, and launch blockers without
 * printing assignment text, gift-code values, participant data, or secrets.
 */

const fs = require('fs');
const path = require('path');

const ALLOWED_TOP_LEVEL_KEYS = new Set(['marathons', 'products', 'gifts', 'steps']);
const DANGEROUS_TOP_LEVEL_KEYS = new Set([
  'answers',
  'marathoners',
  'participants',
  'penaltyReports',
  'stepSubmissions',
  'submissions',
  'users',
  'winners',
]);

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  node scripts/review-marathon-catalog-draft.js <catalog-draft.json> [--json]',
    '',
    'Reviews catalog draft completeness without importing data. Output is',
    'redacted: counts and missing-field classes only, never assignment text or',
    'gift-code values.',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage(0);
  const unexpected = args.filter((arg) => arg.startsWith('-') && arg !== '--json');
  if (unexpected.length) {
    throw new Error(`Unsupported option: ${unexpected[0]}`);
  }
  const fileArg = args.find((arg) => !arg.startsWith('-'));
  if (!fileArg) usage(1);
  return {
    filePath: path.resolve(fileArg),
    json: args.includes('--json'),
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Catalog draft file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function valuePresent(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function getLanguageCode(marathon) {
  return marathon.languageCode ?? marathon.language_code;
}

function getRulesTemplate(marathon) {
  return marathon.rulesTemplate ?? marathon.rules_template;
}

function getPaymentStartsAt(marathon) {
  return marathon.paymentStartsAt ?? marathon.payment_since;
}

function getStepAssignmentContent(step) {
  return step.assignmentContent ?? step.assignment_content ?? step.content;
}

function getStepSequence(step) {
  return step.sequence ?? step.order;
}

function getStepTrial(step) {
  return step.isTrialStep ?? step.trial ?? false;
}

function getStepMarathonSlug(step, fallback) {
  return step.marathonSlug ?? fallback;
}

function getProductMarathonSlug(product, fallback) {
  return product.marathonSlug ?? fallback;
}

function getGiftMarathonSlug(gift, fallback) {
  return gift.marathonSlug ?? fallback;
}

function pushUnique(map, key, label) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(label);
}

function reviewCatalog(input, filePath) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Catalog draft must be an object');
  }

  const topLevelKeys = Object.keys(input);
  const dangerousKeys = topLevelKeys.filter((key) => DANGEROUS_TOP_LEVEL_KEYS.has(key)).sort();
  const unsupportedKeys = topLevelKeys.filter((key) => !ALLOWED_TOP_LEVEL_KEYS.has(key)).sort();
  const marathons = asArray(input.marathons);
  const topLevelSteps = asArray(input.steps);
  const topLevelProducts = asArray(input.products);
  const topLevelGifts = asArray(input.gifts);
  const productsBySlug = new Map();
  const giftsBySlug = new Map();
  const stepsBySlug = new Map();
  const slugLabels = new Map();
  const giftCodeLabels = new Map();

  for (const [index, marathon] of marathons.entries()) {
    const slug = textPresent(marathon?.slug) ? marathon.slug.trim() : '';
    pushUnique(slugLabels, slug, `marathons[${index}]`);
  }

  for (const [index, product] of topLevelProducts.entries()) {
    const slug = getProductMarathonSlug(product, '');
    if (!productsBySlug.has(slug)) productsBySlug.set(slug, []);
    productsBySlug.get(slug).push({ product, index, source: `products[${index}]` });
  }

  for (const [index, gift] of topLevelGifts.entries()) {
    const slug = getGiftMarathonSlug(gift, '');
    if (!giftsBySlug.has(slug)) giftsBySlug.set(slug, []);
    giftsBySlug.get(slug).push({ gift, index, source: `gifts[${index}]` });
    pushUnique(giftCodeLabels, textPresent(gift?.code) ? gift.code.trim() : '', `gifts[${index}]`);
  }

  for (const [index, step] of topLevelSteps.entries()) {
    const slug = getStepMarathonSlug(step, '');
    if (!stepsBySlug.has(slug)) stepsBySlug.set(slug, []);
    stepsBySlug.get(slug).push({ step, index, source: `steps[${index}]` });
  }

  const marathonRows = [];
  let activeMarathons = 0;
  let totalSteps = topLevelSteps.length;
  let trialSteps = topLevelSteps.filter((step) => getStepTrial(step) === true).length;
  let missingAssignmentContent = topLevelSteps.filter((step) => !textPresent(getStepAssignmentContent(step))).length;
  let stepsWithAssignmentContent = topLevelSteps.length - missingAssignmentContent;
  let missingRequiredStepFields = topLevelSteps.filter((step) => !textPresent(step?.title) || !Number.isInteger(getStepSequence(step))).length;
  let missingRequiredMarathonFields = 0;
  let nestedProductCount = 0;
  let nestedGiftCount = 0;
  let missingRequiredProductFields = topLevelProducts.filter((product) => (
    !textPresent(product?.title)
    || !valuePresent(product?.price)
    || !textPresent(product?.currency)
    || !textPresent(getProductMarathonSlug(product, ''))
  )).length;
  let missingRequiredGiftFields = topLevelGifts.filter((gift) => !textPresent(gift?.code) || !textPresent(getGiftMarathonSlug(gift, ''))).length;

  for (const [index, marathon] of marathons.entries()) {
    const slug = textPresent(marathon?.slug) ? marathon.slug.trim() : `marathons[${index}]`;
    const nestedSteps = asArray(marathon?.steps).map((step, stepIndex) => ({
      step,
      index: stepIndex,
      source: `marathons[${index}].steps[${stepIndex}]`,
    }));
    const nestedProducts = marathon?.product ? [{ product: marathon.product, index: 0, source: `marathons[${index}].product` }] : [];
    const nestedGifts = asArray(marathon?.gifts).map((gift, giftIndex) => ({
      gift,
      index: giftIndex,
      source: `marathons[${index}].gifts[${giftIndex}]`,
    }));
    const rowSteps = [...(stepsBySlug.get(slug) || []), ...nestedSteps];
    const rowProducts = [...(productsBySlug.get(slug) || []), ...nestedProducts];
    const rowGifts = [...(giftsBySlug.get(slug) || []), ...nestedGifts];
    const rowTrialSteps = rowSteps.filter(({ step }) => getStepTrial(step) === true).length;
    const rowGatedSteps = rowSteps.length - rowTrialSteps;
    const rowMissingAssignment = rowSteps.filter(({ step }) => !textPresent(getStepAssignmentContent(step))).length;
    const rowMissing = [];

    if (marathon?.active === true) activeMarathons += 1;
    if (!textPresent(getLanguageCode(marathon))) rowMissing.push('languageCode');
    if (!textPresent(marathon?.slug)) rowMissing.push('slug');
    if (!textPresent(marathon?.title)) rowMissing.push('title');
    if (typeof marathon?.active !== 'boolean') rowMissing.push('active');
    if (!rowSteps.length) rowMissing.push('steps');
    if (!rowTrialSteps) rowMissing.push('trial-step');
    if (!rowGatedSteps) rowMissing.push('gated-step');
    if (rowMissingAssignment) rowMissing.push('assignmentContent');
    if (rowProducts.length !== 1) rowMissing.push(rowProducts.length === 0 ? 'product' : 'single-product');
    if (!rowGifts.length) rowMissing.push('gift');

    const rowMissingStepFields = rowSteps.filter(({ step }) => !textPresent(step?.title) || !Number.isInteger(getStepSequence(step))).length;
    const rowMissingProductFields = rowProducts.filter(({ product }) => (
      !textPresent(product?.title)
      || !valuePresent(product?.price)
      || !textPresent(product?.currency)
    )).length;
    const rowMissingGiftFields = rowGifts.filter(({ gift }) => !textPresent(gift?.code)).length;

    missingRequiredMarathonFields += ['languageCode', 'slug', 'title', 'active'].filter((field) => rowMissing.includes(field)).length;
    totalSteps += nestedSteps.length;
    trialSteps += rowTrialSteps;
    missingAssignmentContent += nestedSteps.filter(({ step }) => !textPresent(getStepAssignmentContent(step))).length;
    stepsWithAssignmentContent += nestedSteps.filter(({ step }) => textPresent(getStepAssignmentContent(step))).length;
    missingRequiredStepFields += nestedSteps.filter(({ step }) => !textPresent(step?.title) || !Number.isInteger(getStepSequence(step))).length;
    nestedProductCount += nestedProducts.length;
    nestedGiftCount += nestedGifts.length;
    missingRequiredProductFields += nestedProducts.filter(({ product }) => (
      !textPresent(product?.title)
      || !valuePresent(product?.price)
      || !textPresent(product?.currency)
    )).length;
    missingRequiredGiftFields += nestedGifts.filter(({ gift }) => !textPresent(gift?.code)).length;

    for (const { gift } of nestedGifts) {
      pushUnique(giftCodeLabels, textPresent(gift?.code) ? gift.code.trim() : '', `marathons[${index}].gifts[]`);
    }

    marathonRows.push({
      active: marathon?.active === true,
      gatedSteps: rowGatedSteps,
      giftCodes: rowGifts.length,
      languageCode: textPresent(getLanguageCode(marathon)) ? String(getLanguageCode(marathon)).trim() : '',
      launchReady: rowMissing.length === 0 && rowMissingStepFields === 0 && rowMissingProductFields === 0 && rowMissingGiftFields === 0,
      missing: [...new Set([...rowMissing])],
      missingAssignmentContent: rowMissingAssignment,
      missingGiftFields: rowMissingGiftFields,
      missingProductFields: rowMissingProductFields,
      missingStepFields: rowMissingStepFields,
      products: rowProducts.length,
      rulesTemplatePresent: textPresent(getRulesTemplate(marathon)),
      slug,
      steps: rowSteps.length,
      trialSteps: rowTrialSteps,
      paymentStartsAtPresent: valuePresent(getPaymentStartsAt(marathon)),
    });
  }

  const duplicateSlugs = [...slugLabels.entries()].filter(([, labels]) => labels.length > 1).map(([slug]) => slug);
  const duplicateGiftCodes = [...giftCodeLabels.entries()].filter(([code, labels]) => code && labels.length > 1).map(([, labels]) => labels.length);
  const activeLaunchReady = marathonRows.filter((row) => row.active && row.launchReady).length;
  const activeBlocked = marathonRows.filter((row) => row.active && !row.launchReady).length;

  return {
    source: path.resolve(filePath),
    okForApprovalDryRun: (
      dangerousKeys.length === 0
      && unsupportedKeys.length === 0
      && duplicateSlugs.length === 0
      && duplicateGiftCodes.length === 0
      && activeMarathons > 0
      && activeBlocked === 0
    ),
    counts: {
      activeBlocked,
      activeLaunchReady,
      activeMarathons,
      duplicateGiftCodeGroups: duplicateGiftCodes.length,
      duplicateSlugGroups: duplicateSlugs.length,
      gifts: topLevelGifts.length + nestedGiftCount,
      marathons: marathons.length,
      missingAssignmentContent,
      missingRequiredGiftFields,
      missingRequiredMarathonFields,
      missingRequiredProductFields,
      missingRequiredStepFields,
      products: topLevelProducts.length + nestedProductCount,
      steps: totalSteps,
      stepsWithAssignmentContent,
      trialSteps,
      gatedSteps: totalSteps - trialSteps,
      unsupportedTopLevelKeys: unsupportedKeys.length,
      dangerousTopLevelKeys: dangerousKeys.length,
    },
    dangerousKeys,
    unsupportedKeys,
    marathons: marathonRows,
  };
}

function markdownCell(value) {
  if (value == null || value === '') return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(report) {
  const lines = [
    '# Marathon Catalog Draft Review',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Catalog draft: ${report.source}`,
    '',
    'This review is redacted. It prints counts, missing-field classes, slugs, and readiness flags only.',
    '',
    '## Summary',
    '',
    `- Active marathons: ${report.counts.activeMarathons}`,
    `- Active launch-ready marathons: ${report.counts.activeLaunchReady}`,
    `- Active blocked marathons: ${report.counts.activeBlocked}`,
    `- Steps: ${report.counts.steps}`,
    `- Steps with assignment content: ${report.counts.stepsWithAssignmentContent}`,
    `- Products: ${report.counts.products}`,
    `- Gift codes: ${report.counts.gifts} (count only)`,
    `- Dangerous top-level keys: ${report.counts.dangerousTopLevelKeys}`,
    `- Unsupported top-level keys: ${report.counts.unsupportedTopLevelKeys}`,
    `- Duplicate slug groups: ${report.counts.duplicateSlugGroups}`,
    `- Duplicate gift-code groups: ${report.counts.duplicateGiftCodeGroups} (values hidden)`,
    `- Ready for approval dry run: ${report.okForApprovalDryRun ? 'yes' : 'no'}`,
    '',
    '## Marathon Readiness',
    '',
    '| Active | Language | Slug | Steps | Trial | Gated | Missing assignment | Products | Gift codes | Launch ready | Missing |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---|---|',
  ];

  for (const marathon of report.marathons) {
    lines.push([
      markdownCell(marathon.active ? 'yes' : 'no'),
      markdownCell(marathon.languageCode),
      markdownCell(marathon.slug),
      markdownCell(marathon.steps),
      markdownCell(marathon.trialSteps),
      markdownCell(marathon.gatedSteps),
      markdownCell(marathon.missingAssignmentContent),
      markdownCell(marathon.products),
      markdownCell(marathon.giftCodes),
      markdownCell(marathon.launchReady ? 'yes' : 'no'),
      markdownCell(marathon.missing.length ? marathon.missing.join(', ') : 'none'),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push(
    '',
    'Next step:',
    report.okForApprovalDryRun
      ? '- Run `npm run load:catalog:pod -- /path/to/marathon-catalog.json` and generate the redacted approval packet.'
      : '- Complete missing source-owner fields before running the strict catalog loader dry run.',
  );

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  const report = reviewCatalog(readJson(options.filePath), options.filePath);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderMarkdown(report)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Catalog draft review failed: ${error.message}\n`);
  process.exit(1);
});
