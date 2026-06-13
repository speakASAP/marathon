#!/usr/bin/env node
/**
 * Read-only audit for legacy SpeakASAP Marathon catalog candidates.
 *
 * This script intentionally does not emit catalog JSON and never writes to the
 * database. It prints only field names, counts, paths, redacted per-marathon
 * identifiers, and launch-readiness gaps.
 */

const fs = require('fs');
const path = require('path');

const FIXTURE_MODELS = new Set(['marathon.marathon', 'marathon.step']);
const UNSAFE_MODEL_MARKERS = [
  'answer',
  'marathoner',
  'participant',
  'payment',
  'penalty',
  'submission',
  'user',
  'winner',
];

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  node scripts/audit-legacy-marathon-catalog.js --fixture <marathon.json> [--sql <marathon_de.sql>] [--json]',
    '',
    'Reads legacy Django fixture metadata and reports whether it can satisfy the',
    'approved Marathon catalog-only loader contract. It prints no participant',
    'records, gift codes, assignment text, JWTs, payment payloads, or secrets.',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage(0);

  const options = { json: args.includes('--json'), fixture: '', sql: '' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') continue;
    if (arg === '--fixture') {
      options.fixture = args[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--sql') {
      options.sql = args[index + 1] || '';
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!options.fixture) usage(1);
  return options;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeArray(value, context) {
  if (!Array.isArray(value)) {
    throw new Error(`${context} must be an array`);
  }
  return value;
}

function collectFieldKeys(records) {
  return [...records.reduce((keys, record) => {
    Object.keys(record.fields || {}).forEach((key) => keys.add(key));
    return keys;
  }, new Set())].sort();
}

function isUnsafeModel(model) {
  const normalized = String(model || '').toLowerCase();
  return UNSAFE_MODEL_MARKERS.some((marker) => normalized.includes(marker));
}

function slugForMarathon(record) {
  const fields = record.fields || {};
  const folder = typeof fields.folder === 'string' && fields.folder.trim()
    ? fields.folder.trim()
    : 'legacy';
  return `${folder}-${record.pk}`;
}

function auditFixture(filePath) {
  const records = safeArray(readJson(filePath), 'fixture');
  const byModel = new Map();
  for (const record of records) {
    const model = String(record.model || '');
    if (!byModel.has(model)) byModel.set(model, []);
    byModel.get(model).push(record);
  }

  const unexpectedModels = [...byModel.keys()].filter((model) => !FIXTURE_MODELS.has(model)).sort();
  const unsafeModels = [...byModel.keys()].filter(isUnsafeModel).sort();
  const marathons = byModel.get('marathon.marathon') || [];
  const steps = byModel.get('marathon.step') || [];
  const marathonsByPk = new Map(marathons.map((record) => [record.pk, record]));
  const stepsByMarathon = new Map();
  let orphanSteps = 0;
  let trialSteps = 0;
  let gatedSteps = 0;

  for (const step of steps) {
    const fields = step.fields || {};
    const marathonPk = fields.marathon;
    if (!marathonsByPk.has(marathonPk)) {
      orphanSteps += 1;
      continue;
    }
    if (!stepsByMarathon.has(marathonPk)) stepsByMarathon.set(marathonPk, []);
    stepsByMarathon.get(marathonPk).push(step);
    if (fields.trial === true) trialSteps += 1;
    if (fields.trial !== true) gatedSteps += 1;
  }

  const marathonRows = marathons.map((record) => {
    const fields = record.fields || {};
    const marathonSteps = stepsByMarathon.get(record.pk) || [];
    const rowTrialSteps = marathonSteps.filter((step) => step.fields?.trial === true).length;
    const rowGatedSteps = marathonSteps.length - rowTrialSteps;
    const missing = [];
    if (!marathonSteps.length) missing.push('steps');
    if (!rowTrialSteps) missing.push('trial-step');
    if (!rowGatedSteps) missing.push('gated-step');
    missing.push('assignmentContent');
    missing.push('product');
    missing.push('gift');

    return {
      active: Boolean(fields.active),
      language: fields.language == null ? null : String(fields.language),
      pk: record.pk,
      slug: slugForMarathon(record),
      steps: marathonSteps.length,
      trialSteps: rowTrialSteps,
      gatedSteps: rowGatedSteps,
      missing,
    };
  });

  const activeRows = marathonRows.filter((row) => row.active);
  return {
    source: path.resolve(filePath),
    counts: {
      activeMarathons: activeRows.length,
      fixtureRecords: records.length,
      marathons: marathons.length,
      steps: steps.length,
      products: 0,
      gifts: 0,
      orphanSteps,
      trialSteps,
      gatedSteps,
      stepsWithAssignmentContent: 0,
    },
    fieldKeys: {
      'marathon.marathon': collectFieldKeys(marathons),
      'marathon.step': collectFieldKeys(steps),
    },
    models: [...byModel.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([model, rows]) => ({ model, records: rows.length })),
    unexpectedModels,
    unsafeModels,
    marathons: marathonRows,
    launch: {
      catalogLoaderReady: false,
      applyAllowed: false,
      blockers: [
        'legacy fixture has no approved assignmentContent for MarathonStep rows',
        'legacy fixture has no MarathonProduct rows for VIP checkout',
        'legacy fixture has no MarathonGift rows for gift redemption',
        'source-owner approval is still required before any catalog apply',
      ],
    },
  };
}

function auditSql(filePath) {
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  const inserts = [];
  const insertPattern = /INSERT\s+INTO\s+([\w."`]+)\s*\(([^)]*)\)/gi;
  let match = insertPattern.exec(sql);
  while (match) {
    inserts.push({
      table: match[1].replace(/["`]/g, ''),
      columns: match[2].split(',').map((column) => column.trim().replace(/["`]/g, '')),
    });
    match = insertPattern.exec(sql);
  }

  const byTable = new Map();
  for (const insert of inserts) {
    if (!byTable.has(insert.table)) {
      byTable.set(insert.table, { table: insert.table, inserts: 0, columns: insert.columns });
    }
    byTable.get(insert.table).inserts += 1;
  }

  return {
    source: path.resolve(filePath),
    bytes: Buffer.byteLength(sql),
    insertCount: inserts.length,
    tables: [...byTable.values()].sort((a, b) => a.table.localeCompare(b.table)),
  };
}

function markdownCell(value) {
  if (value == null || value === '') return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(report) {
  const lines = [
    '# Legacy Marathon Catalog Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    `Fixture: ${report.fixture.source}`,
  ];

  if (report.sql) {
    lines.push(`SQL seed: ${report.sql.source}`);
  }

  lines.push(
    '',
    'This report is read-only and redacted. It records counts, field names, paths, and launch blockers only.',
    '',
    '## Fixture Summary',
    '',
    `- Records: ${report.fixture.counts.fixtureRecords}`,
    `- Models: ${report.fixture.models.map((item) => `${item.model}=${item.records}`).join(', ') || 'none'}`,
    `- Active marathons: ${report.fixture.counts.activeMarathons}`,
    `- Steps: ${report.fixture.counts.steps}`,
    `- Trial steps: ${report.fixture.counts.trialSteps}`,
    `- Gated steps: ${report.fixture.counts.gatedSteps}`,
    `- Orphan steps: ${report.fixture.counts.orphanSteps}`,
    `- Products: ${report.fixture.counts.products}`,
    `- Gift codes: ${report.fixture.counts.gifts}`,
    `- Steps with approved assignmentContent: ${report.fixture.counts.stepsWithAssignmentContent}`,
    '',
    '## Field Keys',
    '',
    `- marathon.marathon: ${report.fixture.fieldKeys['marathon.marathon'].join(', ') || 'none'}`,
    `- marathon.step: ${report.fixture.fieldKeys['marathon.step'].join(', ') || 'none'}`,
  );

  if (report.fixture.unexpectedModels.length || report.fixture.unsafeModels.length) {
    lines.push(
      '',
      '## Model Warnings',
      '',
      `- Unexpected models: ${report.fixture.unexpectedModels.join(', ') || 'none'}`,
      `- Unsafe/progress-like models: ${report.fixture.unsafeModels.join(', ') || 'none'}`,
    );
  }

  lines.push(
    '',
    '## Redacted Marathon Readiness',
    '',
    '| Active | PK | Language | Proposed slug | Steps | Trial | Gated | Missing |',
    '|---|---:|---|---|---:|---:|---:|---|',
  );

  for (const marathon of report.fixture.marathons) {
    lines.push([
      markdownCell(marathon.active ? 'yes' : 'no'),
      markdownCell(marathon.pk),
      markdownCell(marathon.language),
      markdownCell(marathon.slug),
      markdownCell(marathon.steps),
      markdownCell(marathon.trialSteps),
      markdownCell(marathon.gatedSteps),
      markdownCell(marathon.missing.join(', ')),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  if (report.sql) {
    lines.push(
      '',
      '## SQL Seed Metadata',
      '',
      `- Bytes: ${report.sql.bytes}`,
      `- INSERT statements: ${report.sql.insertCount}`,
      '',
      '| Table | Inserts | Columns |',
      '|---|---:|---|',
    );
    for (const table of report.sql.tables) {
      lines.push(`| ${markdownCell(table.table)} | ${markdownCell(table.inserts)} | ${markdownCell(table.columns.join(', '))} |`);
    }
  }

  lines.push(
    '',
    '## Launch Decision',
    '',
    `- Catalog loader ready: ${report.fixture.launch.catalogLoaderReady ? 'yes' : 'no'}`,
    `- Apply allowed: ${report.fixture.launch.applyAllowed ? 'yes' : 'no'}`,
    '',
    'Blockers:',
  );
  for (const blocker of report.fixture.launch.blockers) {
    lines.push(`- ${blocker}`);
  }

  lines.push(
    '',
    'Safe next step:',
    '- Ask the source owner to approve which legacy marathon rows should launch, provide approved plain-text assignmentContent, VIP product price/currency, and gift-code inventory, then create a catalog-only JSON file for the existing `npm run load:catalog:pod` dry run.',
  );

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  const report = {
    generatedAt: new Date().toISOString(),
    fixture: auditFixture(options.fixture),
    sql: auditSql(options.sql),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderMarkdown(report)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Legacy catalog audit failed: ${error.message}\n`);
  process.exit(1);
});
