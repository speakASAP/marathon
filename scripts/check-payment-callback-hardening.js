#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const paymentsServicePath = path.join(root, 'src/payments/payments.service.ts');
const smokePath = path.join(root, 'scripts/run-production-smoke-safe.js');

const paymentsService = fs.readFileSync(paymentsServicePath, 'utf8');
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
  paymentsService,
  /summarizeCheckoutResponse/,
  'PaymentsService must summarize checkout responses before persistence.',
);
assertContains(
  paymentsService,
  /summarizeCallbackPayload/,
  'PaymentsService must summarize callback payloads before persistence.',
);
assertNotContains(
  paymentsService,
  /checkoutResponse:\s*responseBody/,
  'PaymentsService must not persist raw checkout response bodies.',
);
assertNotContains(
  paymentsService,
  /callbackPayload:\s*payload\s+as\s+any/,
  'PaymentsService must not persist raw callback payload bodies.',
);
assertContains(
  paymentsService,
  /requireCallbackMarathonerId/,
  'Successful callbacks must require participant metadata.',
);
assertContains(
  paymentsService,
  /validateRequiredCallbackProduct/,
  'Successful callbacks must require product metadata.',
);
assertContains(
  paymentsService,
  /validateCallbackProviderPaymentId/,
  'Successful callbacks must reconcile provider payment identity.',
);
assertContains(
  paymentsService,
  /resolveCallbackAmountCurrency/,
  'Successful callbacks must reconcile amount and currency.',
);
assertContains(
  paymentsService,
  /fetchPaymentStatus/,
  'PaymentsService must support payment-status fallback for callback amount and currency.',
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
