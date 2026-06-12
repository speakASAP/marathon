#!/usr/bin/env node
/**
 * HTTP-level Marathon journey smoke verifier.
 *
 * Default mode is read-only. Mutating checks require --mutating and explicit
 * inputs so production registration/payment/gift/submission checks are never
 * triggered accidentally.
 */

const DEFAULT_BASE_URL = process.env.MARATHON_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://marathon.alfares.cz';
const LANDING_IMAGE_ASSETS = ['talk.png', 'grammar.png', 'materials.png', 'result.png', 'start.png', 'finish.png', 'mail.png'];

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

function getCheckoutRedirectUrl(body, baseUrl) {
  const rawUrl = body?.redirectUrl || body?.payment?.data?.redirectUrl || body?.payment?.redirectUrl;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  try {
    const url = new URL(rawUrl, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch (error) {
    return '';
  }
}

async function assertFrontendShell(report, path, code, message) {
  const response = await request(report, path);
  assertOk(response, path);
  const html = await response.text();
  if (!html.includes('/assets/') || !html.includes('<div id="root"></div>')) {
    throw new Error(`${path} did not return the frontend shell.`);
  }
  addCheck(report, 'pass', code, message);
}

async function assertPublicCatalogContract(report) {
  const schema = await requestJson(report, '/catalog/marathon-catalog.schema.json');
  assertOk(schema.response, '/catalog/marathon-catalog.schema.json');
  const schemaContentType = schema.response.headers.get('content-type') || '';
  if (!schemaContentType.includes('application/json')) {
    throw new Error('/catalog/marathon-catalog.schema.json did not return application/json.');
  }
  if (
    schema.json?.title !== 'Marathon catalog-only launch data' ||
    !Array.isArray(schema.json?.required) ||
    !schema.json.required.includes('marathons') ||
    !schema.json?.properties?.marathons ||
    !schema.json?.properties?.steps ||
    !schema.json?.properties?.products ||
    !schema.json?.properties?.gifts
  ) {
    throw new Error('/catalog/marathon-catalog.schema.json did not return the expected catalog schema shape.');
  }
  addCheck(report, 'pass', 'catalog-contract-schema', 'Public catalog JSON Schema is served as JSON.');

  const exampleResponse = await request(report, '/catalog/marathon-catalog.example.json');
  assertOk(exampleResponse, '/catalog/marathon-catalog.example.json');
  const exampleContentType = exampleResponse.headers.get('content-type') || '';
  if (!exampleContentType.includes('application/json')) {
    throw new Error('/catalog/marathon-catalog.example.json did not return application/json.');
  }
  const exampleBody = await exampleResponse.text();
  if (exampleBody.includes('<div id="root"></div>') || exampleBody.includes('<!DOCTYPE html>')) {
    throw new Error('/catalog/marathon-catalog.example.json returned the frontend shell instead of JSON.');
  }
  let example = null;
  try {
    example = JSON.parse(exampleBody);
  } catch (error) {
    throw new Error('/catalog/marathon-catalog.example.json did not return valid JSON.');
  }
  if (
    !Array.isArray(example.marathons) ||
    example.marathons.length !== 1 ||
    example.marathons[0]?.slug !== 'approved-marathon-slug' ||
    !exampleBody.includes('APPROVED_')
  ) {
    throw new Error('/catalog/marathon-catalog.example.json did not return the placeholder catalog example.');
  }
  for (const forbidden of ['marathoners', 'participants', 'answers', 'submissions', 'winners', 'test@example.com']) {
    if (exampleBody.includes(forbidden)) {
      throw new Error(`/catalog/marathon-catalog.example.json contains forbidden progress or participant marker: ${forbidden}`);
    }
  }
  addCheck(report, 'pass', 'catalog-contract-example', 'Public catalog example is placeholder-only JSON.');

  const approvalResponse = await request(report, '/catalog/marathon-catalog.approval-checklist.md');
  assertOk(approvalResponse, '/catalog/marathon-catalog.approval-checklist.md');
  const approvalBody = await approvalResponse.text();
  if (approvalBody.includes('<div id="root"></div>') || approvalBody.includes('<!DOCTYPE html>')) {
    throw new Error('/catalog/marathon-catalog.approval-checklist.md returned the frontend shell instead of Markdown.');
  }
  for (const required of [
    'Marathon Catalog Source-Owner Approval Checklist',
    'The file contains only `marathons`, `steps`, `products`, and `gifts`.',
    'full gift-code values are not pasted',
    'launchReady: true',
    'npm run load:catalog:pod -- /path/to/marathon-catalog.json --apply',
  ]) {
    if (!approvalBody.includes(required)) {
      throw new Error(`/catalog/marathon-catalog.approval-checklist.md is missing required checklist text: ${required}`);
    }
  }
  for (const forbidden of ['test@example.com', 'MARATHON_SMOKE_AUTH_TOKEN=', 'PAYMENT_WEBHOOK_API_KEY=']) {
    if (approvalBody.includes(forbidden)) {
      throw new Error(`/catalog/marathon-catalog.approval-checklist.md contains forbidden sensitive marker: ${forbidden}`);
    }
  }
  addCheck(report, 'pass', 'catalog-approval-checklist', 'Public source-owner approval checklist is served without sensitive placeholders.');
}

async function assertClosedCatalogLanguageFallback(report, options) {
  const language = options.language || 'en';
  const landingPath = `/${encodeURIComponent(language)}/`;
  await assertFrontendShell(
    report,
    landingPath,
    'frontend-language-fallback-shell',
    `${landingPath} language landing route serves the frontend shell before catalog readiness.`,
  );

  const marathonResponse = await request(report, `/api/v1/marathons/by-language/${encodeURIComponent(language)}`);
  if (marathonResponse.status === 404) {
    addCheck(
      report,
      'pass',
      'language-marathon-api-no-active',
      `No active marathon API response for ${language} is represented as HTTP 404.`,
    );
    return;
  }

  assertOk(marathonResponse, `/api/v1/marathons/by-language/${language}`);
  const body = await marathonResponse.text();
  if (!body.trim()) {
    addCheck(
      report,
      'pass',
      'language-marathon-api-empty-safe',
      `No active marathon API response for ${language} is represented as an empty HTTP 200 body.`,
    );
    return;
  }

  let marathon = null;
  try {
    marathon = JSON.parse(body);
  } catch (error) {
    throw new Error(`/api/v1/marathons/by-language/${language} returned malformed JSON.`);
  }

  if (marathon && typeof marathon === 'object' && !Array.isArray(marathon)) {
    addCheck(
      report,
      'pass',
      marathon.id ? 'language-marathon-api-active' : 'language-marathon-api-empty-object-safe',
      marathon.id
        ? `Active marathon API returned configured marathon data for ${language}.`
        : `No active marathon API response for ${language} is represented as an empty JSON object.`,
    );
    return;
  }

  throw new Error(`/api/v1/marathons/by-language/${language} returned an unexpected response shape.`);
}

async function assertPublicLandingAssetsServed(report) {
  for (const asset of LANDING_IMAGE_ASSETS) {
    const path = `/img/landing/${asset}`;
    const response = await request(report, path);
    assertOk(response, path);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`${path} returned ${contentType || 'no content type'} instead of an image.`);
    }
    const body = await response.arrayBuffer();
    if (body.byteLength === 0) {
      throw new Error(`${path} returned an empty image response.`);
    }
  }
  addCheck(report, 'pass', 'landing-assets-served', 'Resolved landing image assets are served by production as non-empty image responses.');
}

async function assertFrontendHandoffSource(report, rootHtml) {
  const assetMatch = rootHtml.match(/<script[^>]+src="([^"]*\/assets\/[^"]+\.js)"/);
  if (!assetMatch) {
    throw new Error('Root HTML does not reference a built frontend JavaScript asset.');
  }
  const cssMatch = rootHtml.match(/<link[^>]+href="([^"]*\/assets\/[^"]+\.css)"/);
  if (!cssMatch) {
    throw new Error('Root HTML does not reference a built frontend CSS asset.');
  }
  const cssPath = cssMatch[1].startsWith('http') ? cssMatch[1] : cssMatch[1];
  const cssResponse = await request(report, cssPath);
  assertOk(cssResponse, cssPath);
  const css = await cssResponse.text();
  for (const missingAsset of ['adv_1.png', 'adv_2.png', 'adv_3.png', 'adv_4.png', 'adv_5.png', 'adv_6.png', 'support.png']) {
    if (css.includes(`/img/landing/${missingAsset}`)) {
      throw new Error(`Built frontend CSS references missing legacy landing asset: ${missingAsset}`);
    }
  }
  for (const expectedAsset of LANDING_IMAGE_ASSETS) {
    if (!css.includes(`/img/landing/${expectedAsset}`)) {
      throw new Error(`Built frontend CSS is missing resolved landing asset reference: ${expectedAsset}`);
    }
  }
  if (
    !css.includes('counter-reset:support-verification-step') ||
    !css.includes('grid-template-columns:30px minmax(0,1fr)') ||
    !css.includes('support-runbook-command')
  ) {
    throw new Error('Built frontend CSS does not include mobile-safe support runbook command layout.');
  }
  await assertPublicLandingAssetsServed(report);

  const assetPath = assetMatch[1].startsWith('http') ? assetMatch[1] : assetMatch[1];
  const response = await request(report, assetPath);
  assertOk(response, assetPath);
  const js = await response.text();
  if (!js.includes('marathon_token') || !js.includes('next=') || !js.includes('/profile/')) {
    throw new Error('Built frontend bundle does not include token-aware registration profile handoff.');
  }
  if (!js.includes('Registration session expired. Sign in again to bind this marathon to your profile') || !js.includes('Authorization')) {
    throw new Error('Built frontend bundle does not include authenticated registration binding guard.');
  }
  if (!js.includes('Sign in to submit your report') || !js.includes('Open this assignment from your marathon profile')) {
    throw new Error('Built frontend bundle does not include assignment submit authentication guard.');
  }
  if (!js.includes('Saved report status could not be loaded') || !js.includes('Submission is paused until this assignment status can be checked')) {
    throw new Error('Built frontend bundle does not block assignment submission after saved-report status load failures.');
  }
  if (!js.includes('Assignment content is not configured') || !js.includes('Submission is blocked until support adds approved assignment content')) {
    throw new Error('Built frontend bundle does not block assignment submission when approved assignment content is missing.');
  }
  if (!js.includes('Sign in to redeem a gift code') || !js.includes('Open gift redemption from your marathon profile')) {
    throw new Error('Built frontend bundle does not include gift redemption authentication guard.');
  }
  if (!js.includes('#vip-access') || !js.includes('Opening checkout...')) {
    throw new Error('Built frontend bundle does not include VIP checkout login return guard.');
  }
  if (
    !js.includes('Checkout was created, but no valid payment redirect URL was returned') ||
    !js.includes('Payment confirmation is processing') ||
    !js.includes('VIP access is active') ||
    !js.includes('Payment was cancelled')
  ) {
    throw new Error('Built frontend bundle does not include VIP checkout redirect validation and payment return states.');
  }
  if (!js.includes('Profile is temporarily unavailable') || !js.includes('Profile could not be loaded')) {
    throw new Error('Built frontend bundle does not include profile dashboard load-error state.');
  }
  if (!js.includes('Marathon profile is temporarily unavailable') || !js.includes('Marathon profile could not be loaded')) {
    throw new Error('Built frontend bundle does not include profile detail load-error state.');
  }
  if (!js.includes('Assignment is temporarily unavailable') || !js.includes('Assignment could not be loaded')) {
    throw new Error('Built frontend bundle does not include assignment step load-error state.');
  }
  if (!js.includes('Пока нет примеров отчетов') || !js.includes('Ваш собственный отчет можно отправить')) {
    throw new Error('Built frontend bundle does not include assignment peer-report empty state.');
  }
  if (!js.includes('Marathon landing is temporarily unavailable') || !js.includes('Marathon landing could not be loaded')) {
    throw new Error('Built frontend bundle does not include language landing load-error state.');
  }
  if (
    !js.includes('Reviews will appear after the first Marathon launch') ||
    !js.includes('Winner records and participant reviews are shown only after real participants complete')
  ) {
    throw new Error('Built frontend bundle does not include honest language landing review empty state.');
  }
  if (!js.includes('Launch blockers') || !js.includes('ml-missing-gates')) {
    throw new Error('Built frontend bundle does not include language landing missing-launch-gates readiness detail.');
  }
  if (
    !js.includes('No course preview is shown before approval') ||
    !js.includes('ml-readiness-list') ||
    !js.includes('VIP price and checkout appear only after an approved product is configured') ||
    !js.includes('No sample course sequence is shown while the production catalog is empty')
  ) {
    throw new Error('Built frontend bundle does not include closed-catalog landing readiness-only program and pricing state.');
  }
  for (const fakeLandingMarker of ['€29', 'Speak about your weekend', 'Day 12', 'A sample run from the Marathon', '40%', '30 days of daily language practice', '20-30 focused minutes', 'first 3 days']) {
    if (js.includes(fakeLandingMarker)) {
      throw new Error(`Built frontend bundle still includes invented closed-catalog landing marker: ${fakeLandingMarker}`);
    }
  }
  for (const fakeReviewMarker of ['Lucia K.', 'Tomas P.', 'Anna M.']) {
    if (js.includes(fakeReviewMarker)) {
      throw new Error(`Built frontend bundle still includes invented landing review marker: ${fakeReviewMarker}`);
    }
  }
  if (!js.includes('Marathon home is temporarily unavailable') || !js.includes('Marathon home could not be loaded')) {
    throw new Error('Built frontend bundle does not include home load-error state.');
  }
  if (!js.includes('home-missing-gates') || !js.includes('Недостающие условия запуска')) {
    throw new Error('Built frontend bundle does not include home missing-launch-gates readiness detail.');
  }
  if (!js.includes('Финалисты появятся после завершения первых марафонов') || !js.includes('Отзывы появятся после запуска марафона')) {
    throw new Error('Built frontend bundle does not include root finalist/review empty states.');
  }
  if (!js.includes('Финалисты появятся после запуска марафона') || !js.includes('победители и медали пока не сформированы')) {
    throw new Error('Built frontend bundle does not include winners page empty state.');
  }
  if (!js.includes('Registration status is temporarily unavailable') || !js.includes('Registration status could not be loaded')) {
    throw new Error('Built frontend bundle does not include registration readiness load-error state.');
  }
  if (!js.includes('Недостающие условия запуска') || !js.includes('Missing launch gates')) {
    throw new Error('Built frontend bundle does not include registration missing-launch-gates readiness detail.');
  }
  if (!js.includes('npm run load:catalog:pod -- /path/to/catalog.json') || !js.includes('removes the staged catalog copy')) {
    throw new Error('Built frontend bundle does not include the pod-safe catalog load runbook.');
  }
  if (!js.includes('npm run load:catalog:pod -- /path/to/catalog.json --approval-packet')) {
    throw new Error('Built frontend bundle does not include the catalog approval-packet command.');
  }
  if (
    !js.includes('Post-load journey verification') ||
    !js.includes('approved-smoke-gift-code') ||
    !js.includes('--marathoner-id <participant-id> --step-id <step-id>') ||
    !js.includes('support-runbook-command')
  ) {
    throw new Error('Built frontend bundle does not include the post-load journey verification checklist with command styling.');
  }
  if (!js.includes('/catalog/marathon-catalog.approval-checklist.md') || !js.includes('Approval Checklist')) {
    throw new Error('Built frontend bundle does not link the source-owner catalog approval checklist.');
  }
  if (!js.includes('Gift redemption status is temporarily unavailable') || !js.includes('Gift redemption status could not be loaded')) {
    throw new Error('Built frontend bundle does not include gift readiness load-error state.');
  }
  if (
    !js.includes('Checking gift redemption status') ||
    !js.includes('Gift-code entry stays hidden until the production catalog and gift inventory status are verified')
  ) {
    throw new Error('Built frontend bundle does not hide gift redemption entry while readiness is loading.');
  }
  if (!js.includes('Gift launch blockers') || !js.includes('gift-missing-gates')) {
    throw new Error('Built frontend bundle does not include gift missing-launch-gates readiness detail.');
  }
  if (!js.includes('Registration status unavailable. Open registration status page for details.') || !js.includes('registration-status-unavailable')) {
    throw new Error('Built frontend bundle does not include global navigation readiness-unavailable state.');
  }
  if (!js.includes('nav-registration-link')) {
    throw new Error('Built frontend bundle does not use readiness-aware registration label for global navigation.');
  }
  if (!js.includes('/progress-report') || !js.includes('Progress report') || !js.includes('Download JSON')) {
    throw new Error('Built frontend bundle does not include participant progress report UI.');
  }
  if (!js.includes('/nps') || !js.includes('Marathon feedback') || !js.includes('Save feedback')) {
    throw new Error('Built frontend bundle does not include post-marathon NPS feedback UI.');
  }
  addCheck(report, 'pass', 'registration-login-handoff', 'Registration frontend bundle routes new participants through token-aware profile login handoff.');
  addCheck(report, 'pass', 'registration-auth-binding-ui', 'Registration frontend sends Marathon token for immediate participant binding and handles expired sessions.');
  addCheck(report, 'pass', 'assignment-login-guard', 'Assignment report UI requires profile context and token-aware login before submission.');
  addCheck(report, 'pass', 'assignment-status-error-submit-guard', 'Assignment report UI blocks submission when saved-report status cannot be loaded.');
  addCheck(report, 'pass', 'assignment-content-submit-guard', 'Assignment report UI blocks submission when approved assignment content is missing.');
  addCheck(report, 'pass', 'gift-login-guard', 'Gift redemption UI requires profile context and token-aware login before redemption.');
  addCheck(report, 'pass', 'checkout-login-handoff', 'VIP checkout UI preserves profile gate return path when login is required.');
  addCheck(report, 'pass', 'checkout-return-state-ui', 'VIP checkout UI validates payment redirects and renders payment return states.');
  addCheck(report, 'pass', 'profile-error-state', 'Profile dashboard distinguishes load failures from login-required state.');
  addCheck(report, 'pass', 'profile-detail-error-state', 'Profile detail distinguishes load failures from not-found state.');
  addCheck(report, 'pass', 'step-error-state', 'Assignment page distinguishes load failures from not-found state.');
  addCheck(report, 'pass', 'step-peer-empty-state', 'Assignment peer-report tab includes a no-examples empty state.');
  addCheck(report, 'pass', 'landing-error-state', 'Language landing distinguishes API load failures from closed-catalog fallback state.');
  addCheck(report, 'pass', 'landing-review-empty-state', 'Language landing uses a real-data empty state instead of invented testimonials.');
  addCheck(report, 'pass', 'landing-missing-gates-ui', 'Language landing closed-registration panel includes exact missing launch gates from readiness data.');
  addCheck(report, 'pass', 'landing-closed-catalog-real-data-ui', 'Language landing removes invented closed-catalog course, progress, and price markers.');
  addCheck(report, 'pass', 'home-error-state', 'Home page distinguishes readiness API load failures from closed-catalog state.');
  addCheck(report, 'pass', 'home-missing-gates-ui', 'Home closed-catalog panel includes exact missing launch gates from readiness data.');
  addCheck(report, 'pass', 'home-teaser-empty-state', 'Home finalists and reviews teasers include post-load empty states.');
  addCheck(report, 'pass', 'winners-empty-state-ui', 'Winners frontend includes a post-load empty state.');
  addCheck(report, 'pass', 'register-error-state', 'Registration page distinguishes readiness API load failures from closed-catalog state.');
  addCheck(report, 'pass', 'register-missing-gates-ui', 'Registration page includes exact missing launch gates from readiness data.');
  addCheck(report, 'pass', 'catalog-pod-runbook-ui', 'Support runbook includes pod-safe catalog dry-run/apply commands.');
  addCheck(report, 'pass', 'catalog-approval-packet-ui', 'Support runbook includes the redacted catalog approval-packet command.');
  addCheck(report, 'pass', 'post-load-verification-ui', 'Support runbook includes post-catalog-load read-only, registration, VIP, gift, and assignment smoke commands.');
  addCheck(report, 'pass', 'support-runbook-mobile-layout', 'Support runbook command lists use mobile-safe counter columns and command styling.');
  addCheck(report, 'pass', 'catalog-approval-checklist-ui', 'Support runbook links the public source-owner catalog approval checklist.');
  addCheck(report, 'pass', 'landing-assets-resolved', 'Built frontend CSS references existing legacy landing assets instead of missing adv/support images.');
  addCheck(report, 'pass', 'gift-readiness-error-state', 'Gift redemption blocks redemption when readiness status cannot be loaded.');
  addCheck(report, 'pass', 'gift-readiness-loading-state', 'Gift redemption entry stays hidden until readiness status is known.');
  addCheck(report, 'pass', 'gift-missing-gates-ui', 'Gift redemption closed-catalog panel includes exact missing launch gates from readiness data.');
  addCheck(report, 'pass', 'nav-readiness-error-state', 'Global registration navigation distinguishes readiness load failures from closed-catalog state.');
  addCheck(report, 'pass', 'progress-report-ui', 'Profile detail frontend includes authenticated participant progress report generation and JSON download UI.');
  addCheck(report, 'pass', 'nps-survey-ui', 'Profile detail frontend includes completed-marathon NPS feedback UI.');
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

  await assertPublicCatalogContract(report);
  await assertClosedCatalogLanguageFallback(report, options);

  const register = await request(report, '/register');
  assertOk(register, '/register');
  addCheck(report, 'pass', 'frontend-register', '/register route is served.');

  const winners = await requestJson(report, '/api/v1/winners?page=1&limit=1');
  assertOk(winners.response, '/api/v1/winners');
  if (!winners.json || !Array.isArray(winners.json.items) || typeof winners.json.total !== 'number') {
    throw new Error('/api/v1/winners did not return the expected paginated winner shape.');
  }
  addCheck(report, 'pass', 'winners-list', 'Winners endpoint returns the paginated leaderboard shape.');

  const analytics = await requestJson(report, '/api/v1/marathons/analytics');
  assertOk(analytics.response, '/api/v1/marathons/analytics');
  if (
    !analytics.json?.generatedAt ||
    typeof analytics.json?.participants?.total !== 'number' ||
    typeof analytics.json?.payments?.conversionRate !== 'number' ||
    typeof analytics.json?.assignments?.completionRate !== 'number' ||
    typeof analytics.json?.surveys?.responses !== 'number' ||
    typeof analytics.json?.surveys?.npsScore !== 'number'
  ) {
    throw new Error('/api/v1/marathons/analytics did not return the expected aggregate dashboard shape.');
  }
  addCheck(report, 'pass', 'analytics-dashboard', 'Marathon analytics endpoint returns aggregate registration, assignment, payment, and NPS metrics.');

  const runlayerReadiness = await requestJson(report, '/api/v1/tasks/execute', {
    method: 'POST',
    body: JSON.stringify({
      task_id: 'smoke-runlayer-readiness',
      type: 'marathon:readiness_report',
      payload_ref: { smoke: true },
      acceptance_criteria: ['returns output_ref'],
    }),
  });
  assertOk(runlayerReadiness.response, '/api/v1/tasks/execute marathon:readiness_report');
  if (
    runlayerReadiness.json?.output_ref?.source !== 'marathon' ||
    runlayerReadiness.json?.output_ref?.task_type !== 'marathon:readiness_report' ||
    !runlayerReadiness.json?.output_ref?.readiness
  ) {
    throw new Error('Marathon RunLayer readiness task did not return the expected output_ref shape.');
  }
  addCheck(report, 'pass', 'runlayer-readiness-task', 'Marathon RunLayer readiness task returns safe output_ref readiness data.');

  const runlayerEngagement = await requestJson(report, '/api/v1/tasks/execute', {
    method: 'POST',
    body: JSON.stringify({
      task_id: 'smoke-runlayer-engagement',
      type: 'marathon:participant_engagement_plan',
      payload_ref: { smoke: true },
      acceptance_criteria: ['returns aggregate-only plan'],
    }),
  });
  assertOk(runlayerEngagement.response, '/api/v1/tasks/execute marathon:participant_engagement_plan');
  if (
    runlayerEngagement.json?.output_ref?.source !== 'marathon' ||
    !Array.isArray(runlayerEngagement.json?.output_ref?.available_task_types) ||
    !String(runlayerEngagement.json?.output_ref?.privacy || '').includes('participant identifiers')
  ) {
    throw new Error('Marathon RunLayer engagement task did not return the expected aggregate-only output_ref shape.');
  }
  addCheck(report, 'pass', 'runlayer-engagement-task', 'Marathon RunLayer engagement task returns aggregate-only task planning data.');

  await assertFrontendShell(
    report,
    '/profile/smoke-participant?marathon_token=smoke-token',
    'frontend-profile-return',
    'Direct profile-detail login return route serves the frontend shell.',
  );
  await assertFrontendShell(
    report,
    '/steps/smoke-step?marathonerId=smoke-participant&marathon_token=smoke-token',
    'frontend-step-return',
    'Direct assignment login return route serves the frontend shell.',
  );
  await assertFrontendShell(
    report,
    '/gift?marathonerId=smoke-participant&marathon_token=smoke-token',
    'frontend-gift-return',
    'Direct gift-code login return route serves the frontend shell.',
  );

  const unauthenticatedReport = await request(report, '/api/v1/me/marathons/smoke-participant/progress-report');
  assertResponse(unauthenticatedReport, 401, 'unauthenticated progress report');
  addCheck(report, 'pass', 'progress-report-auth-guard', 'Participant progress report endpoint requires authentication.');

  const unauthenticatedNps = await request(report, '/api/v1/me/marathons/smoke-participant/nps', {
    method: 'POST',
    body: JSON.stringify({ score: 10, comment: 'smoke' }),
  });
  assertResponse(unauthenticatedNps, 401, 'unauthenticated NPS survey');
  addCheck(report, 'pass', 'nps-survey-auth-guard', 'Participant NPS survey endpoint requires authentication.');

  const unauthenticatedPaymentCallback = await request(report, '/api/v1/payments/webhook', {
    method: 'POST',
    body: JSON.stringify({
      orderId: 'marathon:smoke-participant:0',
      status: 'success',
      amount: 1,
      currency: 'EUR',
    }),
  });
  assertResponse(unauthenticatedPaymentCallback, 401, 'unauthenticated payment callback');
  addCheck(report, 'pass', 'payment-webhook-auth-guard', 'Payment webhook rejects callbacks without the configured API key.');

  await assertFrontendHandoffSource(report, rootHtml);

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
    authToken: options.authToken,
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
  if (registration.json.userBound !== true) {
    throw new Error('Authenticated registration did not bind the participant to the supplied user token.');
  }
  addCheck(report, 'pass', 'registration-auth-binding', 'Authenticated registration bound the smoke participant to the supplied user token.');

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
    const checkoutRedirectUrl = getCheckoutRedirectUrl(checkout.json, report.baseUrl);
    if (!checkoutRedirectUrl) {
      throw new Error('Checkout response did not include a valid payment redirect URL.');
    }
    report.context.checkout = {
      orderId: checkout.json.orderId,
      status: checkout.json.status,
      redirectHost: new URL(checkoutRedirectUrl).host,
    };
    addCheck(report, 'pass', 'checkout', `VIP checkout returned status ${checkout.json.status}.`);
    addCheck(report, 'pass', 'checkout-redirect-url', 'VIP checkout returned a valid payment redirect URL.');
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
