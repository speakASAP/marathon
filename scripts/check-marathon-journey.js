#!/usr/bin/env node
/**
 * HTTP-level Marathon journey smoke verifier.
 *
 * Default mode is read-only. Mutating checks require --mutating and explicit
 * inputs so production registration/payment/gift/submission checks are never
 * triggered accidentally.
 */

const DEFAULT_BASE_URL = process.env.MARATHON_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://marathon.alfares.cz';

function parseArgs(argv) {
  const options = {
    authToken: process.env.MARATHON_SMOKE_AUTH_TOKEN || '',
    baseUrl: DEFAULT_BASE_URL,
    checkout: false,
    email: '',
    giftCode: '',
    json: false,
    language: '',
    marathonerId: process.env.MARATHON_SMOKE_MARATHONER_ID || '',
    mutating: false,
    stepId: process.env.MARATHON_SMOKE_STEP_ID || '',
    submit: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--mutating') {
      options.mutating = true;
    } else if (arg === '--checkout') {
      options.checkout = true;
    } else if (arg === '--submit') {
      options.submit = true;
    } else if (arg === '--base-url') {
      options.baseUrl = requireValue(argv, ++index, arg);
    } else if (arg === '--email') {
      options.email = requireValue(argv, ++index, arg);
    } else if (arg === '--language') {
      options.language = requireValue(argv, ++index, arg);
    } else if (arg === '--auth-token') {
      options.authToken = requireValue(argv, ++index, arg);
    } else if (arg === '--marathoner-id') {
      options.marathonerId = requireValue(argv, ++index, arg);
    } else if (arg === '--step-id') {
      options.stepId = requireValue(argv, ++index, arg);
    } else if (arg === '--gift-code') {
      options.giftCode = requireValue(argv, ++index, arg);
    } else if (arg === '--help' || arg === '-h') {
      usage(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/$/, '');
  validateOptions(options);
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function validateOptions(options) {
  const requestedMutatingChecks = [
    options.checkout ? '--checkout' : '',
    options.giftCode ? '--gift-code' : '',
    options.submit ? '--submit' : '',
  ].filter(Boolean);

  if (!options.mutating && requestedMutatingChecks.length > 0) {
    throw new Error(`${requestedMutatingChecks.join(', ')} require --mutating`);
  }

  if (options.mutating && !options.email) {
    throw new Error('--mutating requires --email <email>');
  }

  const requestedAuthenticatedChecks = [
    options.checkout ? '--checkout' : '',
    options.giftCode ? '--gift-code' : '',
    options.submit ? '--submit' : '',
  ].filter(Boolean);

  if (requestedAuthenticatedChecks.length > 0 && !options.authToken) {
    throw new Error(`${requestedAuthenticatedChecks.join(', ')} require --auth-token <jwt>`);
  }

  const requestedSavedSubmissionLookup = options.marathonerId || options.stepId;
  if (requestedSavedSubmissionLookup && (!options.marathonerId || !options.stepId)) {
    throw new Error('--marathoner-id and --step-id must be provided together');
  }
  if (requestedSavedSubmissionLookup && !options.authToken) {
    throw new Error('--marathoner-id and --step-id require --auth-token <jwt>');
  }
}

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  npm run check:journey -- [options]',
    '',
    'Read-only default checks:',
    '  --base-url <url>      Target Marathon base URL',
    '  --language <code>     Preferred language code',
    '  --auth-token <jwt>    JWT for optional authenticated read-only checks',
    '  --marathoner-id <id>  Read saved submission for this participant with --step-id',
    '  --step-id <id>        Read saved submission for this step with --marathoner-id',
    '  --json                Print JSON report',
    '',
    'Mutating checks require --mutating:',
    '  --email <email>       Register a smoke participant',
    '  --auth-token <jwt>    Verify profile, checkout, gift, or submission as this user',
    '  --gift-code <code>    Redeem a gift code for the smoke participant',
    '  --checkout            Create a VIP checkout for the smoke participant',
    '  --submit              Submit the current active assignment for the smoke participant',
    '',
    'Environment alternatives:',
    '  MARATHON_BASE_URL, MARATHON_SMOKE_AUTH_TOKEN, MARATHON_SMOKE_MARATHONER_ID, MARATHON_SMOKE_STEP_ID',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function createReport(options) {
  return {
    baseUrl: options.baseUrl,
    mode: options.mutating ? 'mutating' : 'read-only',
    ok: false,
    checks: [],
    context: {},
  };
}

function addCheck(report, status, code, message, detail = undefined) {
  report.checks.push({ status, code, message, ...(detail === undefined ? {} : { detail }) });
}

async function requestJson(report, path, options = {}) {
  const response = await request(report, path, options);
  const body = await response.text();
  let json = null;
  if (body) {
    try {
      json = JSON.parse(body);
    } catch (error) {
      throw new Error(`${path} returned non-JSON response: ${body.slice(0, 160)}`);
    }
  }
  return { response, json };
}

async function request(report, path, options = {}) {
  const url = path.startsWith('http') ? path : `${report.baseUrl}${path}`;
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

function assertResponse(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} returned HTTP ${response.status}, expected ${expected}`);
  }
}

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
}

async function checkPublicRoutes(report, options) {
  const health = await requestJson(report, '/health');
  assertOk(health.response, '/health');
  if (health.json?.status !== 'ok') {
    throw new Error('/health did not return status=ok');
  }
  addCheck(report, 'pass', 'health', '/health returned ok.');

  const root = await request(report, '/');
  assertOk(root, '/');
  const rootHtml = await root.text();
  if (!rootHtml.includes('/assets/')) {
    throw new Error('Root HTML does not reference built assets.');
  }
  addCheck(report, 'pass', 'frontend-root', 'Root frontend shell is served with built assets.');

  const register = await request(report, '/register');
  assertOk(register, '/register');
  addCheck(report, 'pass', 'frontend-register', '/register route is served.');

  const readiness = await requestJson(report, '/api/v1/marathons/readiness');
  assertOk(readiness.response, '/api/v1/marathons/readiness');
  report.context.readiness = readiness.json;
  if (!readiness.json?.ready) {
    addCheck(
      report,
      'fail',
      'catalog-readiness',
      'Catalog readiness is not complete; journey verification cannot proceed.',
      readiness.json,
    );
    return null;
  }
  addCheck(report, 'pass', 'catalog-readiness', 'Catalog readiness endpoint reports ready.');

  const languages = await requestJson(report, '/api/v1/marathons/languages');
  assertOk(languages.response, '/api/v1/marathons/languages');
  if (!Array.isArray(languages.json) || languages.json.length === 0) {
    throw new Error('No marathon languages returned.');
  }
  const selectedLanguage = options.language || languages.json[0].code;
  report.context.language = selectedLanguage;
  addCheck(report, 'pass', 'languages', `${languages.json.length} language(s) returned.`);

  const landing = await request(report, `/${encodeURIComponent(selectedLanguage)}/`);
  assertOk(landing, `/${selectedLanguage}/`);
  addCheck(report, 'pass', 'language-landing', `/${selectedLanguage}/ landing route is served.`);

  const marathon = await requestJson(report, `/api/v1/marathons/by-language/${encodeURIComponent(selectedLanguage)}`);
  assertOk(marathon.response, '/api/v1/marathons/by-language/:code');
  if (!marathon.json?.id) {
    throw new Error(`No active marathon returned for language ${selectedLanguage}.`);
  }
  report.context.marathon = {
    id: marathon.json.id,
    languageCode: marathon.json.languageCode,
    title: marathon.json.title,
  };
  addCheck(report, 'pass', 'active-marathon-api', `Active marathon API returned ${marathon.json.title}.`);

  const steps = await requestJson(report, `/api/v1/steps?marathonId=${encodeURIComponent(marathon.json.id)}`);
  assertOk(steps.response, '/api/v1/steps');
  if (!Array.isArray(steps.json) || steps.json.length === 0) {
    throw new Error('No steps returned for active marathon.');
  }
  report.context.firstStepId = steps.json[0].id;
  addCheck(report, 'pass', 'steps-api', `${steps.json.length} step(s) returned for active marathon.`);

  const step = await requestJson(report, `/api/v1/steps/${encodeURIComponent(steps.json[0].id)}`);
  assertOk(step.response, '/api/v1/steps/:id');
  if (!step.json?.id) {
    throw new Error('Step detail did not return an id.');
  }
  addCheck(report, 'pass', 'step-detail-api', 'Step detail API returned the first step.');
  if (!step.json.assignmentContent?.trim()) {
    throw new Error('Step detail did not include assignmentContent.');
  }
  addCheck(report, 'pass', 'step-content-api', 'Step detail API returned assignment content.');
  return { marathon: marathon.json, steps: steps.json };
}

function requireMutating(options, field, message) {
  if (!options.mutating) {
    return false;
  }
  if (!field) {
    throw new Error(message);
  }
  return true;
}

async function checkAuthenticatedReadOnly(report, options) {
  if (!options.marathonerId && !options.stepId) {
    return;
  }

  const savedSubmission = await requestJson(
    report,
    `/api/v1/me/marathons/${encodeURIComponent(options.marathonerId)}/submissions/${encodeURIComponent(options.stepId)}`,
    { authToken: options.authToken },
  );
  assertOk(savedSubmission.response, 'GET /api/v1/me/marathons/:id/submissions/:stepId');
  if (typeof savedSubmission.json?.exists !== 'boolean') {
    throw new Error('Saved submission lookup did not return exists boolean.');
  }
  if (savedSubmission.json.marathonerId !== options.marathonerId) {
    throw new Error('Saved submission lookup returned a different marathonerId.');
  }
  if (savedSubmission.json.stepId !== options.stepId) {
    throw new Error('Saved submission lookup returned a different stepId.');
  }
  report.context.savedSubmission = {
    exists: savedSubmission.json.exists,
    marathonerId: savedSubmission.json.marathonerId,
    stepId: savedSubmission.json.stepId,
    state: savedSubmission.json.state,
  };
  addCheck(
    report,
    'pass',
    'saved-submission-read',
    savedSubmission.json.exists
      ? 'Authenticated saved submission lookup returned an existing report.'
      : 'Authenticated saved submission lookup returned an empty state.',
  );
}

async function checkMutatingJourney(report, options, publicContext) {
  if (!options.mutating) {
    addCheck(report, 'pass', 'mutation-skipped', 'Mutating journey checks were skipped by default.');
    return;
  }
  if (!publicContext) {
    throw new Error('Cannot run mutating journey checks until read-only catalog checks pass.');
  }
  requireMutating(options, options.email, '--mutating requires --email <email>');

  const registration = await requestJson(report, '/api/v1/registrations', {
    method: 'POST',
    body: JSON.stringify({
      email: options.email,
      languageCode: publicContext.marathon.languageCode,
      name: 'Marathon Smoke Test',
    }),
  });
  assertResponse(registration.response, 201, 'POST /api/v1/registrations');
  if (!registration.json?.marathonerId) {
    throw new Error('Registration did not return marathonerId.');
  }
  const marathonerId = registration.json.marathonerId;
  report.context.marathonerId = marathonerId;
  addCheck(report, 'pass', 'registration', `Registered smoke participant ${marathonerId}.`);

  if (!options.authToken) {
    addCheck(report, 'pass', 'auth-skipped', 'Authenticated profile/payment/submission checks skipped; no auth token provided.');
    return;
  }

  const profile = await requestJson(report, `/api/v1/me/marathons/${encodeURIComponent(marathonerId)}`, {
    authToken: options.authToken,
  });
  assertOk(profile.response, 'GET /api/v1/me/marathons/:id');
  if (!profile.json?.id || profile.json.id !== marathonerId) {
    throw new Error('Profile detail did not return the smoke participant.');
  }
  addCheck(report, 'pass', 'profile', 'Authenticated profile detail returned the smoke participant.');

  if (options.giftCode) {
    const gift = await requestJson(report, '/api/v1/vip/gift-redemptions', {
      method: 'POST',
      authToken: options.authToken,
      body: JSON.stringify({ marathonerId, code: options.giftCode }),
    });
    assertOk(gift.response, 'POST /api/v1/vip/gift-redemptions');
    addCheck(report, 'pass', 'gift-redemption', 'Gift code redemption returned success.');
  }

  if (options.checkout) {
    const checkout = await requestJson(report, '/api/v1/vip/checkout', {
      method: 'POST',
      authToken: options.authToken,
      body: JSON.stringify({ marathonerId }),
    });
    assertOk(checkout.response, 'POST /api/v1/vip/checkout');
    if (!checkout.json?.status) {
      throw new Error('Checkout response did not include status.');
    }
    if (!checkout.json?.orderId) {
      throw new Error('Checkout response did not include orderId for payment callback reconciliation.');
    }
    addCheck(report, 'pass', 'checkout', `VIP checkout returned status ${checkout.json.status}.`);
  }

  if (options.submit) {
    const activeStep = profile.json.answers?.find((answer) => answer.state === 'active');
    if (!activeStep?.stepId) {
      throw new Error('No active step available for submission smoke test.');
    }
    const reportText = `Smoke test submission ${new Date().toISOString()}`;
    const submission = await requestJson(report, `/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/submissions`, {
      method: 'POST',
      authToken: options.authToken,
      body: JSON.stringify({
        stepId: activeStep.stepId,
        report: reportText,
        completed: true,
      }),
    });
    assertOk(submission.response, 'POST /api/v1/me/marathons/:id/submissions');
    if (!submission.json?.id) {
      throw new Error('Submission did not return id.');
    }
    addCheck(report, 'pass', 'submission', 'Assignment submission returned a saved submission.');

    const savedSubmission = await requestJson(
      report,
      `/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/submissions/${encodeURIComponent(activeStep.stepId)}`,
      { authToken: options.authToken },
    );
    assertOk(savedSubmission.response, 'GET /api/v1/me/marathons/:id/submissions/:stepId');
    if (!savedSubmission.json?.exists || savedSubmission.json.id !== submission.json.id) {
      throw new Error('Saved submission lookup did not return the submitted report.');
    }
    if (savedSubmission.json.report !== reportText) {
      throw new Error('Saved submission lookup did not return the submitted report text.');
    }
    addCheck(report, 'pass', 'saved-submission-after-submit', 'Saved submission lookup returned the smoke submission.');
  }
}

function printText(report) {
  console.log(`Marathon journey smoke: ${report.ok ? 'ready' : 'not ready'}`);
  console.log(`Base URL: ${report.baseUrl}`);
  console.log(`Mode: ${report.mode}`);
  for (const check of report.checks) {
    const marker = check.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.code}: ${check.message}`);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const report = createReport(options);
  try {
    const publicContext = await checkPublicRoutes(report, options);
    await checkAuthenticatedReadOnly(report, options);
    await checkMutatingJourney(report, options, publicContext);
  } catch (error) {
    addCheck(report, 'fail', 'journey-error', error.message || String(error));
  }
  report.ok = report.checks.every((check) => check.status === 'pass');

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
