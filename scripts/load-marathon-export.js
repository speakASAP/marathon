/**
 * Load marathon export JSON into marathon service DB (Prisma).
 *
 * Run on dev server after export from speakasap-portal:
 *   node scripts/load-marathon-export.js [path/to/marathon_export.json]
 *
 * Requires DATABASE_URL in .env. Creates UUIDs for all entities; optionally
 * writes id_mapping.json for portal MarathonIdMapping population.
 *
 * See docs/refactoring/MARATHON_CURRENT_STATUS_AND_NEXT_STEPS.md (Data export).
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseDate(s) {
  if (s == null || s === '') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse "HH:MM:SS" and apply to base date. Returns Date. */
function parseTimeOnDate(timeStr, baseDate) {
  if (!timeStr || !baseDate) return baseDate ? new Date(baseDate) : new Date();
  const [h, m, s] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setUTCHours(h || 0, m || 0, s || 0, 0);
  return d;
}

function loadExport(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function run() {
  const exportPath = process.argv[2] || path.join(__dirname, '..', 'marathon_export.json');
  if (!fs.existsSync(exportPath)) {
    console.error('Export file not found:', exportPath);
    console.error('Usage: node scripts/load-marathon-export.js [path/to/marathon_export.json]');
    process.exit(1);
  }

  const data = loadExport(exportPath);
  const marathonIdToUuid = {};
  const stepIdToUuid = {};
  const marathonerIdToUuid = {};
  const winnerIdToUuid = {};
  const idMapping = { marathon: [], step: [], marathoner: [], winner: [] };

  // 1. Marathons
  for (const m of data.marathons || []) {
    const id = randomUUID();
    marathonIdToUuid[m.id] = id;
    idMapping.marathon.push({ legacy_id: m.id, new_uuid: id });
    await prisma.marathon.create({
      data: {
        id,
        languageCode: m.language_code || 'en',
        title: m.title || '',
        slug: `${m.folder || 'marathon'}-${m.id}`,
        rulesTemplate: m.rules_template || null,
        active: !!m.active,
        landingVideoUrl: m.landing_video || null,
        vipGateDate: parseDate(m.vip_since),
        discountEndsAt: parseDate(m.discount_till),
        coverImageUrl: m.image || null,
      },
    });
  }
  console.log('Marathons:', (data.marathons || []).length);

  // 2. Steps
  for (const s of data.steps || []) {
    const marathonUuid = marathonIdToUuid[s.marathon_id];
    if (!marathonUuid) continue;
    const id = randomUUID();
    stepIdToUuid[s.id] = id;
    idMapping.step.push({ legacy_id: s.id, new_uuid: id });
    await prisma.marathonStep.create({
      data: {
        id,
        marathonId: marathonUuid,
        title: s.title || '',
        sequence: s.order ?? 0,
        isPenalized: !!s.penalize,
        formKey: s.form_class || null,
        socialLink: s.sn_link || null,
        isTrialStep: !!s.trial,
      },
    });
  }
  console.log('Steps:', (data.steps || []).length);

  // 3. Participants (marathoners)
  for (const r of data.marathoners || []) {
    const marathonUuid = marathonIdToUuid[r.marathon_id];
    if (!marathonUuid) continue;
    const id = randomUUID();
    marathonerIdToUuid[r.id] = id;
    idMapping.marathoner.push({ legacy_id: r.id, new_uuid: id });
    const createdAt = parseDate(r.created) || new Date();
    const reportHour = parseTimeOnDate(r.report_hour, createdAt);
    await prisma.marathonParticipant.create({
      data: {
        id,
        userId: r.user_id != null ? String(r.user_id) : null,
        marathonId: marathonUuid,
        email: r.email || null,
        name: r.name || null,
        isFree: !!r.is_free,
        vipRequired: !!r.vip_required,
        paymentReported: !!r.payment_reported,
        bonusDaysLeft: r.days ?? 7,
        canUsePenalty: r.can_use_penalty !== false,
        active: r.active !== false,
        reportHour,
        hasWarning: !!r.has_warning,
        createdAt,
        finishedAt: parseDate(r.finish_date),
      },
    });
  }
  console.log('Participants:', (data.marathoners || []).length);

  // 4. Step submissions (answers)
  let submissions = 0;
  for (const a of data.answers || []) {
    const participantUuid = marathonerIdToUuid[a.marathoner_id];
    const stepUuid = stepIdToUuid[a.step_id];
    if (!participantUuid || !stepUuid) continue;
    const id = randomUUID();
    await prisma.stepSubmission.create({
      data: {
        id,
        participantId: participantUuid,
        stepId: stepUuid,
        startAt: parseDate(a.start) || new Date(),
        endAt: parseDate(a.stop) || new Date(),
        isCompleted: !!a.completed,
        isChecked: !!a.checked,
        rating: a.rating ?? 0,
        payloadJson: a.value ?? undefined,
      },
    });
    submissions++;
  }
  console.log('Submissions:', submissions);

  // 5. Winners
  for (const w of data.winners || []) {
    const id = randomUUID();
    winnerIdToUuid[w.id] = id;
    idMapping.winner.push({ legacy_id: w.id, new_uuid: id });
    await prisma.marathonWinner.create({
      data: {
        id,
        userId: String(w.user_id),
        goldCount: w.gold ?? 0,
        silverCount: w.silver ?? 0,
        bronzeCount: w.bronze ?? 0,
      },
    });
  }
  console.log('Winners:', (data.winners || []).length);

  const mappingPath = path.join(path.dirname(exportPath), 'marathon_id_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(idMapping, null, 2), 'utf8');
  console.log('ID mapping written to', mappingPath);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
