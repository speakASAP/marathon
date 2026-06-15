#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vipServicePath = path.join(root, 'src/vip/vip.service.ts');
const smokePath = path.join(root, 'scripts/run-production-smoke-safe.js');

const vipService = fs.readFileSync(vipServicePath, 'utf8');
const smoke = fs.readFileSync(smokePath, 'utf8');

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

function assertNotContains(source, pattern, message) {
  if (pattern.test(source)) {
    throw new Error(message);
  }
}

assertContains(
  vipService,
  /summarizeCheckoutResponse/,
  'VipService must summarize checkout responses before persistence.',
);
assertContains(
  vipService,
  /summarizeCallbackPayload/,
  'VipService must summarize callback payloads before persistence.',
);
assertNotContains(
  vipService,
  /checkoutResponse:\s*responseBody/,
  'VipService must not persist raw checkout response bodies.',
);
assertNotContains(
  vipService,
  /callbackPayload:\s*payload\s+as\s+any/,
  'VipService must not persist raw callback payload bodies.',
);
assertContains(
  vipService,
  /requireCallbackMarathonerId/,
  'Successful callbacks must require participant metadata.',
);
assertContains(
  vipService,
  /validateRequiredCallbackProduct/,
  'Successful callbacks must require product metadata.',
);
assertContains(
  vipService,
  /validateCallbackProviderPaymentId/,
  'Successful callbacks must reconcile provider payment identity.',
);
assertContains(
  vipService,
  /resolveCallbackAmountCurrency/,
  'Successful callbacks must reconcile amount and currency.',
);
assertContains(
  vipService,
  /fetchPaymentStatus/,
  'VipService must support payment-status fallback for callback amount and currency.',
);
assertContains(
  smoke,
  /paymentId/,
  'Production-safe smoke callback must include paymentId for callback reconciliation.',
);
assertContains(
  smoke,
  /productId:\s*checkoutAttempt\.productId/,
  'Production-safe smoke callback must include checkout attempt productId.',
);

console.log('payment callback hardening static checks passed');
