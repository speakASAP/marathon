#!/usr/bin/env node
/**
 * Load human-approved Marathon catalog data only.
 *
 * This intentionally rejects participant/progress data. Legacy full-export
 * loaders are disabled because historical exports include user progress.
 */

const fs = require('fs');
const path = require('path');

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

const ALLOWED_TOP_LEVEL_KEYS = new Set(['marathons', 'products', 'gifts', 'steps']);
const ALLOWED_MARATHON_KEYS = new Set([
  'active',
  'coverImageUrl',
  'discountEndsAt',
  'folder',
  'gifts',
  'id',
  'landingVideoUrl',
  'languageCode',
  'language_code',
  'product',
  'rulesTemplate',
  'rules_template',
  'slug',
  'steps',
  'title',
  'vipGateDate',
  'vip_since',
]);
const ALLOWED_STEP_KEYS = new Set([
  'assignmentContent',
  'assignment_content',
  'content',
  'formKey',
  'form_class',
  'isPenalized',
  'isTrialStep',
  'marathonSlug',
  'order',
  'penalize',
  'sequence',
  'sn_link',
  'socialLink',
  'title',
  'trial',
]);
const ALLOWED_PRODUCT_KEYS = new Set([
  'currency',
  'marathonSlug',
  'price',
  'title',
  'totalHours',
]);
const ALLOWED_GIFT_KEYS = new Set(['code', 'marathonSlug']);

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  node scripts/load-marathon-catalog.js <catalog.json> [--apply] [--allow-incomplete] [--approval-packet]',
    '',
    'Default mode validates a launch-ready catalog and prints a dry-run summary.',
    'Use --approval-packet to print a redacted Markdown packet for source-owner approval.',
    'Use --apply only after the JSON has been human-approved.',
    'Use --allow-incomplete only for staged non-launch imports.',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage(0);
  }

  const allowIncomplete = args.includes('--allow-incomplete');
  const apply = args.includes('--apply');
  const approvalPacket = args.includes('--approval-packet');
  const unexpected = args.filter((arg) => (
    arg.startsWith('-')
    && arg !== '--apply'
    && arg !== '--allow-incomplete'
    && arg !== '--approval-packet'
  ));
  if (unexpected.length) {
    throw new Error(`Unsupported option: ${unexpected[0]}`);
  }
  if (apply && approvalPacket) {
    throw new Error('--approval-packet cannot be combined with --apply');
  }

  const fileArg = args.find((arg) => !arg.startsWith('-'));
  if (!fileArg) {
    usage(1);
  }

  return {
    allowIncomplete,
    apply,
    approvalPacket,
    filePath: path.resolve(fileArg),
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Catalog file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertPlainObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
}

function assertAllowedKeys(record, allowedKeys, context) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${context} contains unsupported key "${key}"`);
    }
  }
}

function requiredString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${context} is required`);
  }
  return value.trim();
}

function optionalString(value, context) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${context} must be a string`);
  }
  return value.trim() || null;
}

function requiredBoolean(value, context) {
  if (typeof value !== 'boolean') {
    throw new Error(`${context} must be true or false`);
  }
  return value;
}

function optionalBoolean(value, fallback, context) {
  if (value == null) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error(`${context} must be true or false`);
  }
  return value;
}

function requiredInteger(value, context) {
  if (!Number.isInteger(value)) {
    throw new Error(`${context} must be an integer`);
  }
  return value;
}

function optionalInteger(value, fallback, context) {
  if (value == null) return fallback;
  if (!Number.isInteger(value)) {
    throw new Error(`${context} must be an integer`);
  }
  return value;
}

function parseDate(value, context) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${context} must be an ISO date string`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${context} must be a valid ISO date string`);
  }
  return date;
}

function parsePrice(value, context) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${context} must be a number or decimal string`);
  }
  const decimal = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(decimal)) {
    throw new Error(`${context} must be a positive decimal with up to 2 decimals`);
  }
  if (Number(decimal) <= 0) {
    throw new Error(`${context} must be greater than zero`);
  }
  return decimal;
}

function normalizeCurrency(value, context) {
  const currency = requiredString(value, context).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`${context} must be a 3-letter currency code`);
  }
  return currency;
}

function pushUnique(map, key, context) {
  if (map.has(key)) {
    throw new Error(`Duplicate ${context}: ${key}`);
  }
  map.add(key);
}

function normalizeMarathon(raw, index) {
  assertPlainObject(raw, `marathons[${index}]`);
  assertAllowedKeys(raw, ALLOWED_MARATHON_KEYS, `marathons[${index}]`);

  const languageCode = requiredString(
    raw.languageCode ?? raw.language_code,
    `marathons[${index}].languageCode`,
  );
  const slug = optionalString(raw.slug, `marathons[${index}].slug`)
    || (raw.folder && raw.id != null ? `${requiredString(raw.folder, `marathons[${index}].folder`)}-${raw.id}` : null);

  if (!slug) {
    throw new Error(`marathons[${index}].slug is required unless folder and id are provided`);
  }

  return {
    active: requiredBoolean(raw.active, `marathons[${index}].active`),
    coverImageUrl: optionalString(raw.coverImageUrl, `marathons[${index}].coverImageUrl`),
    discountEndsAt: parseDate(raw.discountEndsAt, `marathons[${index}].discountEndsAt`),
    landingVideoUrl: optionalString(raw.landingVideoUrl, `marathons[${index}].landingVideoUrl`),
    languageCode,
    rulesTemplate: optionalString(raw.rulesTemplate ?? raw.rules_template, `marathons[${index}].rulesTemplate`),
    slug,
    title: requiredString(raw.title, `marathons[${index}].title`),
    vipGateDate: parseDate(raw.vipGateDate ?? raw.vip_since, `marathons[${index}].vipGateDate`),
  };
}

function normalizeStep(raw, index, marathonSlug) {
  assertPlainObject(raw, `steps[${index}]`);
  assertAllowedKeys(raw, ALLOWED_STEP_KEYS, `steps[${index}]`);

  return {
    assignmentContent: requiredString(
      raw.assignmentContent ?? raw.assignment_content ?? raw.content,
      `steps[${index}].assignmentContent`,
    ),
    formKey: optionalString(raw.formKey ?? raw.form_class, `steps[${index}].formKey`),
    isPenalized: optionalBoolean(raw.isPenalized ?? raw.penalize, true, `steps[${index}].isPenalized`),
    isTrialStep: optionalBoolean(raw.isTrialStep ?? raw.trial, false, `steps[${index}].isTrialStep`),
    marathonSlug: requiredString(raw.marathonSlug ?? marathonSlug, `steps[${index}].marathonSlug`),
    sequence: requiredInteger(raw.sequence ?? raw.order, `steps[${index}].sequence`),
    socialLink: optionalString(raw.socialLink ?? raw.sn_link, `steps[${index}].socialLink`),
    title: requiredString(raw.title, `steps[${index}].title`),
  };
}

function normalizeProduct(raw, index, marathonSlug) {
  assertPlainObject(raw, `products[${index}]`);
  assertAllowedKeys(raw, ALLOWED_PRODUCT_KEYS, `products[${index}]`);

  return {
    currency: normalizeCurrency(raw.currency, `products[${index}].currency`),
    marathonSlug: requiredString(raw.marathonSlug ?? marathonSlug, `products[${index}].marathonSlug`),
    price: parsePrice(raw.price, `products[${index}].price`),
    title: requiredString(raw.title, `products[${index}].title`),
    totalHours: optionalInteger(raw.totalHours, 50, `products[${index}].totalHours`),
  };
}

function normalizeGift(raw, index, marathonSlug) {
  assertPlainObject(raw, `gifts[${index}]`);
  assertAllowedKeys(raw, ALLOWED_GIFT_KEYS, `gifts[${index}]`);

  return {
    code: requiredString(raw.code, `gifts[${index}].code`),
    marathonSlug: requiredString(raw.marathonSlug ?? marathonSlug, `gifts[${index}].marathonSlug`),
  };
}

function validateLaunchReadiness(catalog, options = {}) {
  if (options.allowIncomplete) return;

  const activeMarathons = catalog.marathons.filter((marathon) => marathon.active);
  if (activeMarathons.length === 0) {
    throw new Error('launch-ready catalog requires at least one active marathon; use --allow-incomplete only for staged non-launch imports');
  }

  const productsBySlug = new Map(catalog.products.map((product) => [product.marathonSlug, product]));
  const giftsBySlug = new Map();
  const stepsBySlug = new Map();

  for (const gift of catalog.gifts) {
    if (!giftsBySlug.has(gift.marathonSlug)) giftsBySlug.set(gift.marathonSlug, []);
    giftsBySlug.get(gift.marathonSlug).push(gift);
  }

  for (const step of catalog.steps) {
    if (!stepsBySlug.has(step.marathonSlug)) stepsBySlug.set(step.marathonSlug, []);
    stepsBySlug.get(step.marathonSlug).push(step);
  }

  for (const marathon of activeMarathons) {
    const label = `${marathon.languageCode}/${marathon.slug}`;
    const marathonSteps = stepsBySlug.get(marathon.slug) || [];
    const trialSteps = marathonSteps.filter((step) => step.isTrialStep);
    const gatedSteps = marathonSteps.filter((step) => !step.isTrialStep);

    if (marathonSteps.length === 0) {
      throw new Error(`launch-ready catalog requires at least one MarathonStep for active marathon ${label}`);
    }
    if (trialSteps.length === 0) {
      throw new Error(`launch-ready catalog requires at least one trial MarathonStep for active marathon ${label}`);
    }
    if (gatedSteps.length === 0) {
      throw new Error(`launch-ready catalog requires at least one non-trial MarathonStep for active marathon ${label}`);
    }
    if (!productsBySlug.has(marathon.slug)) {
      throw new Error(`launch-ready catalog requires one MarathonProduct for active marathon ${label}`);
    }
    if (!giftsBySlug.has(marathon.slug)) {
      throw new Error(`launch-ready catalog requires at least one MarathonGift code for active marathon ${label}`);
    }
  }
}

function buildLaunchChecklist(catalog) {
  const productsBySlug = new Map(catalog.products.map((product) => [product.marathonSlug, product]));
  const giftsBySlug = new Map();
  const stepsBySlug = new Map();

  for (const gift of catalog.gifts) {
    if (!giftsBySlug.has(gift.marathonSlug)) giftsBySlug.set(gift.marathonSlug, []);
    giftsBySlug.get(gift.marathonSlug).push(gift);
  }

  for (const step of catalog.steps) {
    if (!stepsBySlug.has(step.marathonSlug)) stepsBySlug.set(step.marathonSlug, []);
    stepsBySlug.get(step.marathonSlug).push(step);
  }

  const marathons = catalog.marathons.map((marathon) => {
    const steps = stepsBySlug.get(marathon.slug) || [];
    const trialSteps = steps.filter((step) => step.isTrialStep);
    const gatedSteps = steps.filter((step) => !step.isTrialStep);
    const gifts = giftsBySlug.get(marathon.slug) || [];
    const hasProduct = productsBySlug.has(marathon.slug);
    const missing = [];

    if (marathon.active) {
      if (!steps.length) missing.push('steps');
      if (!trialSteps.length) missing.push('trial-step');
      if (!gatedSteps.length) missing.push('gated-step');
      if (!hasProduct) missing.push('product');
      if (!gifts.length) missing.push('gift');
    }

    return {
      active: marathon.active,
      assignmentContentReady: steps.every((step) => Boolean(step.assignmentContent)),
      gatedSteps: gatedSteps.length,
      giftCodes: gifts.length,
      languageCode: marathon.languageCode,
      launchReady: missing.length === 0,
      missing,
      products: hasProduct ? 1 : 0,
      slug: marathon.slug,
      steps: steps.length,
      title: marathon.title,
      trialSteps: trialSteps.length,
    };
  });

  return {
    activeMarathons: marathons.filter((marathon) => marathon.active).length,
    marathons,
    note: 'Gift codes are reported only as counts. Review the source file directly for approved code values.',
  };
}

function markdownCell(value) {
  if (value == null || value === '') return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildApprovalPacket(catalog, options = {}) {
  const launchChecklist = buildLaunchChecklist(catalog);
  const productsBySlug = new Map(catalog.products.map((product) => [product.marathonSlug, product]));
  const generatedAt = new Date().toISOString();
  const sourceFile = options.filePath ? path.basename(options.filePath) : 'catalog.json';

  const lines = [
    '# Marathon Catalog Approval Packet',
    '',
    `Generated at: ${generatedAt}`,
    `Catalog file: ${sourceFile}`,
    `Launch-ready validation: ${options.allowIncomplete ? 'disabled with --allow-incomplete' : 'enabled'}`,
    '',
    'This packet is redacted for approval evidence. It never prints gift-code values, assignment report payloads, participant records, JWTs, payment keys, or full assignment text.',
    '',
    '## Summary',
    '',
    `- Marathons: ${catalog.marathons.length}`,
    `- Active marathons: ${launchChecklist.activeMarathons}`,
    `- Steps: ${catalog.steps.length}`,
    `- Products: ${catalog.products.length}`,
    `- Gift codes: ${catalog.gifts.length} (count only)`,
    '',
    '## Marathon Readiness',
    '',
    '| Active | Language | Slug | Title | Steps | Trial | Gated | Product | Gift codes | Assignment content | Launch ready | Missing |',
    '|---|---|---|---|---:|---:|---:|---|---:|---|---|---|',
  ];

  for (const marathon of launchChecklist.marathons) {
    const product = productsBySlug.get(marathon.slug);
    const productLabel = product
      ? `${product.title} ${product.price} ${product.currency}`
      : 'missing';
    lines.push([
      markdownCell(marathon.active ? 'yes' : 'no'),
      markdownCell(marathon.languageCode),
      markdownCell(marathon.slug),
      markdownCell(marathon.title),
      markdownCell(marathon.steps),
      markdownCell(marathon.trialSteps),
      markdownCell(marathon.gatedSteps),
      markdownCell(productLabel),
      markdownCell(marathon.giftCodes),
      markdownCell(marathon.assignmentContentReady ? 'yes' : 'no'),
      markdownCell(marathon.launchReady ? 'yes' : 'no'),
      markdownCell(marathon.missing.length ? marathon.missing.join(', ') : 'none'),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push(
    '',
    '## Source-Owner Sign-Off',
    '',
    '- [ ] Every active marathon language, slug, title, launch state, VIP product, price, currency, assignment text, and gift-code inventory count matches the source of truth.',
    '- [ ] The source owner reviewed actual gift-code values in the source file or source system, but this packet intentionally records counts only.',
    '- [ ] The JSON file contains only Marathon/Product/Gift/Step catalog rows and no participant progress, users, answers, submissions, winners, payment attempts, JWTs, or secrets.',
    '- [ ] `launchReady` is `yes` for every active marathon before `--apply` is run.',
    '',
    'Next command after approval:',
    '',
    '```bash',
    'npm run load:catalog:pod -- /path/to/marathon-catalog.json --apply',
    '```',
  );

  return lines.join('\n');
}

function normalizeCatalog(input, options = {}) {
  assertPlainObject(input, 'catalog');

  for (const key of Object.keys(input)) {
    if (DANGEROUS_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(`Refusing catalog import: top-level "${key}" contains user/progress data`);
    }
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(`Unsupported top-level key "${key}"`);
    }
  }

  const rawMarathons = input.marathons || [];
  if (!Array.isArray(rawMarathons) || rawMarathons.length === 0) {
    throw new Error('catalog.marathons must contain at least one marathon');
  }

  const marathons = [];
  const steps = [];
  const products = [];
  const gifts = [];
  const slugs = new Set();
  const productSlugs = new Set();
  const stepKeys = new Set();
  const giftCodes = new Set();

  rawMarathons.forEach((rawMarathon, index) => {
    const marathon = normalizeMarathon(rawMarathon, index);
    pushUnique(slugs, marathon.slug, 'marathon slug');
    marathons.push(marathon);

    if (rawMarathon.product != null) {
      const product = normalizeProduct(rawMarathon.product, products.length, marathon.slug);
      pushUnique(productSlugs, product.marathonSlug, 'product marathonSlug');
      products.push(product);
    }

    if (rawMarathon.steps != null) {
      if (!Array.isArray(rawMarathon.steps)) {
        throw new Error(`marathons[${index}].steps must be an array`);
      }
      rawMarathon.steps.forEach((rawStep) => {
        const step = normalizeStep(rawStep, steps.length, marathon.slug);
        pushUnique(stepKeys, `${step.marathonSlug}:${step.sequence}`, 'step sequence');
        steps.push(step);
      });
    }

    if (rawMarathon.gifts != null) {
      if (!Array.isArray(rawMarathon.gifts)) {
        throw new Error(`marathons[${index}].gifts must be an array`);
      }
      rawMarathon.gifts.forEach((rawGift) => {
        const gift = normalizeGift(rawGift, gifts.length, marathon.slug);
        pushUnique(giftCodes, gift.code, 'gift code');
        gifts.push(gift);
      });
    }
  });

  (input.products || []).forEach((rawProduct, index) => {
    const product = normalizeProduct(rawProduct, index, null);
    pushUnique(productSlugs, product.marathonSlug, 'product marathonSlug');
    products.push(product);
  });

  (input.steps || []).forEach((rawStep, index) => {
    const step = normalizeStep(rawStep, index, null);
    pushUnique(stepKeys, `${step.marathonSlug}:${step.sequence}`, 'step sequence');
    steps.push(step);
  });

  (input.gifts || []).forEach((rawGift, index) => {
    const gift = normalizeGift(rawGift, index, null);
    pushUnique(giftCodes, gift.code, 'gift code');
    gifts.push(gift);
  });

  for (const product of products) {
    if (!slugs.has(product.marathonSlug)) {
      throw new Error(`Product references unknown marathonSlug: ${product.marathonSlug}`);
    }
  }
  for (const step of steps) {
    if (!slugs.has(step.marathonSlug)) {
      throw new Error(`Step references unknown marathonSlug: ${step.marathonSlug}`);
    }
  }
  for (const gift of gifts) {
    if (!slugs.has(gift.marathonSlug)) {
      throw new Error(`Gift references unknown marathonSlug: ${gift.marathonSlug}`);
    }
  }

  if (steps.length === 0) {
    throw new Error('catalog must contain at least one approved MarathonStep');
  }

  const catalog = { gifts, marathons, products, steps };
  validateLaunchReadiness(catalog, options);
  return catalog;
}

async function assertNoExistingRows(prisma, catalog) {
  const slugs = catalog.marathons.map((marathon) => marathon.slug);
  const existingMarathons = await prisma.marathon.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  if (existingMarathons.length) {
    throw new Error(`Refusing to overwrite existing Marathon rows: ${existingMarathons.map((m) => m.slug).join(', ')}`);
  }

  const giftCodes = catalog.gifts.map((gift) => gift.code);
  if (giftCodes.length) {
    const existingGifts = await prisma.marathonGift.findMany({
      where: { code: { in: giftCodes } },
      select: { code: true },
    });
    if (existingGifts.length) {
      throw new Error(`Refusing to overwrite existing MarathonGift rows: ${existingGifts.map((g) => g.code).join(', ')}`);
    }
  }
}

async function applyCatalog(catalog) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await assertNoExistingRows(prisma, catalog);

    const result = await prisma.$transaction(async (tx) => {
      const marathonBySlug = new Map();

      for (const marathon of catalog.marathons) {
        const created = await tx.marathon.create({ data: marathon });
        marathonBySlug.set(marathon.slug, created);
      }

      for (const product of catalog.products) {
        const marathon = marathonBySlug.get(product.marathonSlug);
        await tx.marathonProduct.create({
          data: {
            currency: product.currency,
            marathonId: marathon.id,
            price: product.price,
            title: product.title,
            totalHours: product.totalHours,
          },
        });
      }

      for (const step of catalog.steps) {
        const marathon = marathonBySlug.get(step.marathonSlug);
        await tx.marathonStep.create({
          data: {
            assignmentContent: step.assignmentContent,
            formKey: step.formKey,
            isPenalized: step.isPenalized,
            isTrialStep: step.isTrialStep,
            marathonId: marathon.id,
            sequence: step.sequence,
            socialLink: step.socialLink,
            title: step.title,
          },
        });
      }

      for (const gift of catalog.gifts) {
        const marathon = marathonBySlug.get(gift.marathonSlug);
        await tx.marathonGift.create({
          data: {
            code: gift.code,
            marathonId: marathon.id,
          },
        });
      }

      return {
        gifts: catalog.gifts.length,
        marathons: catalog.marathons.length,
        products: catalog.products.length,
        steps: catalog.steps.length,
      };
    });

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { allowIncomplete, apply, approvalPacket, filePath } = parseArgs(process.argv);
  const catalog = normalizeCatalog(readJson(filePath), { allowIncomplete });
  const summary = {
    gifts: catalog.gifts.length,
    marathons: catalog.marathons.length,
    products: catalog.products.length,
    steps: catalog.steps.length,
  };
  const launchChecklist = buildLaunchChecklist(catalog);

  if (approvalPacket) {
    console.log(buildApprovalPacket(catalog, { allowIncomplete, filePath }));
    return;
  }

  if (!apply) {
    console.log(JSON.stringify({
      launchChecklist,
      launchReadyValidation: !allowIncomplete,
      mode: 'dry-run',
      ok: true,
      summary,
    }, null, 2));
    return;
  }

  const result = await applyCatalog(catalog);
  console.log(JSON.stringify({
    launchChecklist,
    launchReadyValidation: !allowIncomplete,
    mode: 'apply',
    ok: true,
    summary: result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
