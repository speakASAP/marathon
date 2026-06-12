#!/usr/bin/env node
/**
 * Read-only production readiness preflight for Marathon.
 *
 * Run inside the Marathon runtime when possible so DATABASE_URL and payment
 * environment variables match production.
 */

const REQUIRED_ENV_KEYS = ['PAYMENT_API_KEY', 'PAYMENT_WEBHOOK_API_KEY'];

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

function addCheck(checks, status, code, message, detail = undefined) {
  checks.push({ status, code, message, ...(detail === undefined ? {} : { detail }) });
}

function publicMarathon(marathon) {
  return {
    id: marathon.id,
    languageCode: marathon.languageCode,
    slug: marathon.slug,
    title: marathon.title,
    active: marathon.active,
    vipGateDate: marathon.vipGateDate,
    product: marathon.product
      ? {
          id: marathon.product.id,
          title: marathon.product.title,
          price: marathon.product.price.toString(),
          currency: marathon.product.currency,
          totalHours: marathon.product.totalHours,
        }
      : null,
    stepCount: marathon.steps.length,
    trialStepCount: marathon.steps.filter((step) => step.isTrialStep).length,
    gatedStepCount: marathon.steps.filter((step) => !step.isTrialStep).length,
    unusedGiftCount: marathon.gifts.length,
  };
}

async function buildReport() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const checks = [];

  try {
    const [
      activeMarathons,
      marathons,
      products,
      gifts,
      unusedGifts,
      steps,
      participants,
    ] = await Promise.all([
      prisma.marathon.count({ where: { active: true } }),
      prisma.marathon.count(),
      prisma.marathonProduct.count(),
      prisma.marathonGift.count(),
      prisma.marathonGift.count({ where: { usedAt: null } }),
      prisma.marathonStep.count(),
      prisma.marathonParticipant.count(),
    ]);

    const activeCatalog = await prisma.marathon.findMany({
      where: { active: true },
      include: {
        product: true,
        gifts: {
          where: { usedAt: null },
          select: { id: true },
        },
        steps: {
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            isTrialStep: true,
            sequence: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      activeMarathons,
      marathons,
      products,
      gifts,
      unusedGifts,
      steps,
      participants,
    };

    if (activeCatalog.length === 0) {
      addCheck(checks, 'fail', 'active-marathon', 'No active Marathon rows exist; public registration cannot open.');
    } else {
      addCheck(checks, 'pass', 'active-marathon', `${activeCatalog.length} active Marathon row(s) found.`);
    }

    if (steps === 0) {
      addCheck(checks, 'fail', 'catalog-steps', 'No MarathonStep rows exist; assignment submission cannot be verified.');
    }
    if (products === 0) {
      addCheck(checks, 'fail', 'catalog-products', 'No MarathonProduct rows exist; VIP checkout cannot be verified.');
    }
    if (unusedGifts === 0) {
      addCheck(checks, 'fail', 'catalog-gifts', 'No unused MarathonGift rows exist; gift redemption cannot be verified.');
    }

    for (const marathon of activeCatalog) {
      const label = `${marathon.languageCode}/${marathon.slug}`;
      if (marathon.steps.length === 0) {
        addCheck(checks, 'fail', 'steps', `${label} has no MarathonStep rows; assignments cannot open.`);
      } else {
        addCheck(checks, 'pass', 'steps', `${label} has ${marathon.steps.length} MarathonStep row(s).`);
      }

      const gatedSteps = marathon.steps.filter((step) => !step.isTrialStep);
      if (gatedSteps.length === 0) {
        addCheck(checks, 'fail', 'gated-steps', `${label} has no non-trial step; VIP post-gate access cannot be verified.`);
      } else {
        addCheck(checks, 'pass', 'gated-steps', `${label} has ${gatedSteps.length} non-trial step(s).`);
      }

      if (!marathon.product) {
        addCheck(checks, 'fail', 'product', `${label} has no MarathonProduct row; VIP checkout cannot be created.`);
      } else {
        const amount = Number(marathon.product.price.toString());
        if (!Number.isFinite(amount) || amount <= 0) {
          addCheck(checks, 'fail', 'product-price', `${label} has invalid MarathonProduct.price.`);
        } else if (!/^[A-Z]{3}$/.test(marathon.product.currency)) {
          addCheck(checks, 'fail', 'product-currency', `${label} has invalid MarathonProduct.currency.`);
        } else {
          addCheck(checks, 'pass', 'product', `${label} has VIP product ${marathon.product.currency} ${marathon.product.price.toString()}.`);
        }
      }

      if (marathon.gifts.length === 0) {
        addCheck(checks, 'fail', 'gift', `${label} has no unused MarathonGift row; gift redemption cannot be verified.`);
      } else {
        addCheck(checks, 'pass', 'gift', `${label} has ${marathon.gifts.length} unused gift code(s).`);
      }
    }

    for (const key of REQUIRED_ENV_KEYS) {
      if (process.env[key]) {
        addCheck(checks, 'pass', `env-${key}`, `${key} is configured.`);
      } else {
        addCheck(checks, 'fail', `env-${key}`, `${key} is not configured in this runtime.`);
      }
    }

    if (process.env.PAYMENT_APPLICATION_ID && process.env.PAYMENT_APPLICATION_ID !== 'marathon') {
      addCheck(checks, 'fail', 'env-PAYMENT_APPLICATION_ID', 'PAYMENT_APPLICATION_ID is configured but is not "marathon".');
    } else {
      addCheck(checks, 'pass', 'env-PAYMENT_APPLICATION_ID', `PAYMENT_APPLICATION_ID is ${process.env.PAYMENT_APPLICATION_ID || 'default marathon'}.`);
    }

    const ok = checks.every((check) => check.status === 'pass');
    return {
      ok,
      summary,
      checks,
      activeMarathons: activeCatalog.map(publicMarathon),
    };
  } finally {
    await prisma.$disconnect();
  }
}

function printText(report) {
  console.log(`Marathon production readiness: ${report.ok ? 'ready' : 'not ready'}`);
  console.log(`Counts: ${JSON.stringify(report.summary)}`);
  for (const check of report.checks) {
    const marker = check.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.code}: ${check.message}`);
  }
}

buildReport()
  .then((report) => {
    if (hasArg('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printText(report);
    }
    process.exit(report.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
