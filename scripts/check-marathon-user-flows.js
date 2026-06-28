#!/usr/bin/env node
/**
 * User-facing Marathon flow smoke verifier.
 *
 * Covers:
 * 1. A visitor traverses every public page and user-entry route.
 * 2. A new participant chooses a language/marathon and attempts registration.
 * 3. A registered participant reaches the marathon payment checkout boundary.
 * 4. Payment return URLs land back on the Marathon dashboard.
 * 5. The dashboard exposes post-payment actions: current assignment, report, and feedback.
 *
 * The script never submits a real card/payment. Authenticated checkout creation
 * runs only when MARATHON_SMOKE_AUTH_TOKEN or --auth-token is supplied.
 */

const crypto = require('crypto');

const DEFAULT_BASE_URL = process.env.MARATHON_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://marathon.alfares.cz';
const STATIC_ROUTES = [
  '/',
  '/register',
  '/awards',
  '/leave-confirm',
  '/winners',
  '/reviews',
  '/about',
  '/rules',
  '/faq',
  '/profile',
];

function parseArgs(argv) {
  const options = {
    authToken: process.env.MARATHON_SMOKE_AUTH_TOKEN || '',
    baseUrl: DEFAULT_BASE_URL,
    email: process.env.MARATHON_SMOKE_EMAIL || '',
    json: false,
    language: process.env.MARATHON_SMOKE_LANGUAGE || '',
    requireCheckout: process.env.MARATHON_REQUIRE_CHECKOUT_SMOKE === '1',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--require-checkout') {
      options.requireCheckout = true;
    } else if (arg === '--base-url') {
      options.baseUrl = requireValue(argv, ++index, arg);
    } else if (arg === '--language') {
      options.language = requireValue(argv, ++index, arg);
    } else if (arg === '--email') {
      options.email = requireValue(argv, ++index, arg);
    } else if (arg === '--auth-token') {
      options.authToken = requireValue(argv, ++index, arg);
    } else if (arg === '--help' || arg === '-h') {
      usage(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/$/, '');
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function usage(exitCode = 0) {
  const message = [
    'Usage:',
    '  npm run check:user-flows -- [options]',
    '',
    'Options:',
    '  --base-url <url>       Target Marathon base URL',
    '  --language <code>      Preferred language code',
    '  --email <email>        Smoke registration email; defaults to generated example.invalid',
    '  --auth-token <jwt>     Optional portal JWT for authenticated checkout boundary',
    '  --require-checkout     Fail if authenticated checkout cannot run',
    '  --json                 Print JSON report',
    '',
    'Environment alternatives:',
    '  MARATHON_BASE_URL, PUBLIC_BASE_URL, MARATHON_SMOKE_LANGUAGE, MARATHON_SMOKE_EMAIL,',
    '  MARATHON_SMOKE_AUTH_TOKEN, MARATHON_REQUIRE_CHECKOUT_SMOKE=1',
  ].join('\n');
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${message}\n`);
  process.exit(exitCode);
}

function createReport(options) {
  return {
    baseUrl: options.baseUrl,
    ok: false,
    checks: [],
    context: {
      checkoutMode: options.authToken ? 'authenticated' : 'unauthenticated-boundary',
    },
  };
}

function addCheck(report, status, code, message, detail = undefined) {
  report.checks.push({ status, code, message, ...(detail === undefined ? {} : { detail }) });
}

function mask(value) {
  const text = String(value || '');
  if (text.length <= 8) return text ? '***' : '';
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

async function request(report, path, options = {}) {
  const url = path.startsWith('http') ? path : `${report.baseUrl}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
      ...(options.headers || {}),
    },
  });
}

async function requestJson(report, path, options = {}) {
  const response = await request(report, path, options);
  const text = await response.text();
  let json = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`${path} returned non-JSON: ${text.slice(0, 160)}`);
    }
  }
  return { response, json };
}

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
}

function assertShell(html, label) {
  if (!html.includes('<div id="root"></div>') || !html.includes('/assets/')) {
    throw new Error(`${label} did not return the frontend shell.`);
  }
}

async function assertFrontendRoute(report, path) {
  const response = await request(report, path);
  assertOk(response, path);
  const html = await response.text();
  assertShell(html, path);
}

function assertBundleMarkerGroups(bundle, groups, label) {
  for (const markers of groups) {
    if (!markers.some((marker) => bundle.includes(marker))) {
      throw new Error(`${label} is missing marker group: ${markers.join(' | ')}`);
    }
  }
}

function getCheckoutRedirectUrl(body, baseUrl) {
  const rawUrl = body?.redirectUrl || body?.payment?.data?.redirectUrl || body?.payment?.redirectUrl;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  try {
    const url = new URL(rawUrl, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}

async function getFrontendBundle(report) {
  const root = await request(report, '/');
  assertOk(root, '/');
  const html = await root.text();
  assertShell(html, '/');
  const assetMatch = html.match(/<script[^>]+src="([^"]*\/assets\/[^"]+\.js)"/);
  if (!assetMatch) {
    throw new Error('Root HTML does not reference a built frontend JavaScript asset.');
  }
  const assetPath = assetMatch[1].startsWith('http') ? assetMatch[1] : assetMatch[1];
  const response = await request(report, assetPath);
  assertOk(response, assetPath);
  return response.text();
}

async function checkVisitorTraversal(report, options) {
  const languages = await requestJson(report, '/api/v1/marathons/languages');
  assertOk(languages.response, '/api/v1/marathons/languages');
  const languageList = Array.isArray(languages.json) ? languages.json : [];
  const selectedLanguage = options.language || languageList[0]?.code || 'en';
  const routes = new Set([...STATIC_ROUTES, `/${encodeURIComponent(selectedLanguage)}/`, `/marathon/${encodeURIComponent(selectedLanguage)}`]);

  const winners = await requestJson(report, '/api/v1/winners?page=1&limit=1');
  assertOk(winners.response, '/api/v1/winners');
  if (Array.isArray(winners.json?.items) && winners.json.items[0]?.id) {
    routes.add(`/winners/${encodeURIComponent(winners.json.items[0].id)}`);
  }

  const marathon = await requestJson(report, `/api/v1/marathons/by-language/${encodeURIComponent(selectedLanguage)}`);
  if (marathon.response.ok && marathon.json?.id) {
    const steps = await requestJson(report, `/api/v1/steps?marathonId=${encodeURIComponent(marathon.json.id)}`);
    assertOk(steps.response, '/api/v1/steps');
    if (Array.isArray(steps.json) && steps.json[0]?.id) {
      routes.add(`/steps/${encodeURIComponent(steps.json[0].id)}?marathonerId=smoke-participant`);
      routes.add(`/support/step/${encodeURIComponent(steps.json[0].id)}`);
    }
  } else if (marathon.response.status !== 404) {
    assertOk(marathon.response, `/api/v1/marathons/by-language/${selectedLanguage}`);
  }

  for (const route of routes) {
    await assertFrontendRoute(report, route);
  }
  report.context.traversedRoutes = Array.from(routes).sort();
  addCheck(report, 'pass', 'visitor-all-pages', `Visitor route traversal served ${routes.size} page(s) without HTTP errors.`);

  const bundle = await getFrontendBundle(report);
  const markerGroups = [
    ['Start my marathon', 'Start your language marathon today', 'Начать марафон'],
    ['Start my marathon', 'Run the', '30-day route', 'Пройдите марафон', 'Маршрут на 30 дней', '30-дневный маршрут'],
    ['View registration status', 'Registration status', 'Статус регистрации', 'Посмотреть статус регистрации'],
    ['My marathon', 'Open my marathon', 'Мой марафон', 'Открыть мой марафон', '/profile'],
    ['auth.alfares.cz/login', 'auth.alfares.cz/register', 'return_url', 'client_id', 'marathon', 'access_token', 'refresh_token'],
    ['Pay with PayPal', 'Mastercard', 'Bank transfer', 'Оплатить', 'Банковский перевод', 'Нужна оплата марафона'],
    ['Contact support', 'Связаться с поддержкой', '/faq'],
    ['Спросите чат-агента о марафоне', 'support-chat-panel', 'Чат отвечает только по марафонам'],
    ['/register'],
    ['/awards'],
    ['/winners'],
    ['/reviews'],
    ['/about'],
    ['/rules'],
    ['/faq'],
    ['/profile'],
  ];
  assertBundleMarkerGroups(bundle, markerGroups, 'Frontend bundle visitor navigation/action contract');
  addCheck(report, 'pass', 'visitor-navigation-actions', 'Primary visitor navigation and CTA markers are present in the frontend bundle.');

  return { selectedLanguage, activeMarathon: marathon.response.ok ? marathon.json : null, bundle };
}

async function checkRegistrationAttempt(report, options, traversalContext) {
  const readiness = await requestJson(report, '/api/v1/marathons/readiness');
  assertOk(readiness.response, '/api/v1/marathons/readiness');
  report.context.readiness = {
    ready: Boolean(readiness.json?.ready),
    registrationOpen: Boolean(readiness.json?.registrationOpen),
    missing: Array.isArray(readiness.json?.missing) ? readiness.json.missing : [],
  };

  if (readiness.json?.registrationOpen !== true) {
    addCheck(
      report,
      'pass',
      'new-user-registration-closed-state',
      'New user registration attempt stops at the public closed-registration state until catalog readiness is green.',
      report.context.readiness,
    );
    return null;
  }

  const language = traversalContext.selectedLanguage;
  const marathon = traversalContext.activeMarathon || (await requestJson(report, `/api/v1/marathons/by-language/${encodeURIComponent(language)}`)).json;
  if (!marathon?.id) {
    throw new Error(`Registration is open but no active marathon was returned for ${language}.`);
  }

  const email = options.email || `marathon-user-flow-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.invalid`;
  const phone = `+420${String(Date.now()).slice(-9)}`;
  const registration = await requestJson(report, '/api/v1/registrations', {
    method: 'POST',
    authToken: options.authToken,
    body: JSON.stringify({
      email,
      phone,
      name: 'Marathon User Flow Smoke',
      languageCode: marathon.languageCode,
    }),
  });
  if (registration.response.status !== 201) {
    throw new Error(`Registration returned HTTP ${registration.response.status}, expected 201.`);
  }
  if (!registration.json?.marathonerId) {
    throw new Error('Registration did not return marathonerId.');
  }
  const profilePath = `/profile/${encodeURIComponent(registration.json.marathonerId)}`;
  report.context.registration = {
    email: mask(email),
    marathonerId: mask(registration.json.marathonerId),
    userBound: registration.json.userBound === true,
    hasRedirectUrl: typeof registration.json.redirectUrl === 'string' && registration.json.redirectUrl.length > 0,
    profilePath,
  };
  await assertFrontendRoute(report, profilePath);
  await assertFrontendRoute(report, `${profilePath}?payment=success`);
  await assertFrontendRoute(report, `${profilePath}?payment=cancelled`);
  addCheck(report, 'pass', 'new-user-registration', 'New user can choose language/marathon, submit registration, and reach the profile handoff route.');
  addCheck(report, 'pass', 'payment-return-routes', 'Payment success and cancellation return URLs serve the same Marathon profile dashboard route.');
  return registration.json.marathonerId;
}

function checkDashboardBundleContract(report, bundle) {
  const markerGroups = [
    ['Payment is processing', 'Платеж обрабатывается'],
    ['Payment confirmed', 'Оплата подтверждена'],
    ['Payment was cancelled', 'Оплата отменена'],
    ['Automatic payment status check', 'Мы проверяем подтверждение оплаты автоматически'],
    ['Payment required', 'Нужна оплата марафона'],
    ['Pay', 'Оплатить'],
    ['PayPal'],
    ['Mastercard'],
    ['Bank transfer', 'Банковский перевод'],
    ['Progress report', 'Отчет прогресса'],
    ['Generate report', 'Сформировать отчет'],
    ['Current step', 'Текущий этап'],
    ['Open assignment', 'Открыть задание', 'Открыть'],
    ['Marathon feedback', 'Отзыв о марафоне'],
    ['Save feedback', 'Update feedback', 'Сохранить отзыв', 'Обновить отзыв'],
  ];
  assertBundleMarkerGroups(bundle, markerGroups, 'Frontend bundle dashboard/payment contract');
  addCheck(report, 'pass', 'dashboard-payment-action-markers', 'Dashboard bundle contains payment return, checkout, current assignment, report, and feedback action markers.');
}

async function checkAuthenticatedDashboard(report, options, marathonerId) {
  if (!options.authToken || !marathonerId) {
    addCheck(report, 'pass', 'dashboard-authenticated-skipped', 'Authenticated dashboard API checks were skipped because no smoke auth token or registered participant was supplied.');
    return;
  }

  const profile = await requestJson(report, `/api/v1/me/marathons/${encodeURIComponent(marathonerId)}`, {
    authToken: options.authToken,
  });
  assertOk(profile.response, 'GET /api/v1/me/marathons/:marathonerId');
  if (!profile.json?.id || profile.json.id !== marathonerId) {
    throw new Error('Authenticated dashboard did not return the registered participant profile.');
  }
  if (!Array.isArray(profile.json.answers)) {
    throw new Error('Authenticated dashboard response did not include assignment state.');
  }

  report.context.dashboard = {
    type: profile.json.type || '',
    paymentRequired: Boolean(profile.json.payment_required),
    hasCurrentStep: Boolean(profile.json.current_step?.stepId),
    assignmentCount: profile.json.answers.length,
    finished: Boolean(profile.json.finished_at),
  };

  if (profile.json.current_step?.stepId) {
    await assertFrontendRoute(report, `/steps/${encodeURIComponent(profile.json.current_step.stepId)}?marathonerId=${encodeURIComponent(marathonerId)}`);
  }

  const reportResponse = await requestJson(report, `/api/v1/me/marathons/${encodeURIComponent(marathonerId)}/progress-report`, {
    authToken: options.authToken,
  });
  if (profile.json.can_generate_progress_report) {
    assertOk(reportResponse.response, "GET /api/v1/me/marathons/:marathonerId/progress-report");
    if (!reportResponse.json?.summary || !reportResponse.json?.access) {
      throw new Error("Progress report did not include summary/access dashboard data.");
    }
    addCheck(report, "pass", "dashboard-progress-report-ready", "Eligible authenticated dashboard can generate a progress report.");
  } else {
    assertResponse(reportResponse.response, profile.json.payment_required ? 403 : 400, "pre-eligibility progress report");
    addCheck(report, "pass", "dashboard-progress-report-gated", "Progress report generation is blocked until payment and checked-step eligibility are satisfied.");
  }
  addCheck(report, "pass", "dashboard-post-payment-actions", "Authenticated dashboard exposes assignment state, current-step route when available, and gates progress report actions by eligibility.");
}

async function checkPaymentAttempt(report, options, marathonerId) {
  if (!marathonerId) {
    addCheck(report, 'pass', 'payment-flow-gated-before-registration', 'Payment attempt is skipped because registration is closed or unavailable.');
    return;
  }

  await assertFrontendRoute(report, `/profile/${encodeURIComponent(marathonerId)}#payment-access`);

  const unauthenticatedCheckout = await request(report, '/api/v1/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({ marathonerId }),
  });
  if (unauthenticatedCheckout.status !== 401) {
    throw new Error(`Unauthenticated checkout returned HTTP ${unauthenticatedCheckout.status}, expected 401.`);
  }
  addCheck(report, 'pass', 'payment-auth-gate', 'Checkout button boundary requires an authenticated Marathon profile session.');

  if (!options.authToken) {
    if (options.requireCheckout) {
      throw new Error('Authenticated checkout smoke was required, but no auth token was supplied.');
    }
    addCheck(report, 'pass', 'payment-checkout-skipped', 'Authenticated basket creation was skipped because no smoke auth token was supplied.');
    return;
  }

  const checkout = await requestJson(report, '/api/v1/payments/checkout', {
    method: 'POST',
    authToken: options.authToken,
    body: JSON.stringify({ marathonerId }),
  });
  assertOk(checkout.response, 'POST /api/v1/payments/checkout');
  if (!checkout.json?.status) {
    throw new Error('Checkout response did not include status.');
  }
  const redirectUrl = getCheckoutRedirectUrl(checkout.json, report.baseUrl);
  if (!redirectUrl) {
    throw new Error('Checkout did not return a valid basket/payment redirect URL.');
  }
  const redirect = new URL(redirectUrl);
  if (redirect.host === new URL(report.baseUrl).host) {
    throw new Error('Checkout redirect points back to Marathon instead of the payment provider.');
  }
  report.context.checkout = {
    status: checkout.json.status,
    orderId: mask(checkout.json.orderId),
    redirectHost: redirect.host,
  };
  addCheck(report, 'pass', 'payment-checkout-basket', 'Registered authenticated participant can create checkout and receive a basket/payment redirect URL outside Marathon.');
}

function printText(report) {
  console.log(`Marathon user-flow smoke: ${report.ok ? 'passed' : 'failed'}`);
  console.log(`Base URL: ${report.baseUrl}`);
  for (const check of report.checks) {
    const marker = check.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.code}: ${check.message}`);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const report = createReport(options);
  try {
    const traversalContext = await checkVisitorTraversal(report, options);
    checkDashboardBundleContract(report, traversalContext.bundle);
    const marathonerId = await checkRegistrationAttempt(report, options, traversalContext);
    await checkPaymentAttempt(report, options, marathonerId);
    await checkAuthenticatedDashboard(report, options, marathonerId);
  } catch (error) {
    addCheck(report, 'fail', 'user-flow-error', error.message || String(error));
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
