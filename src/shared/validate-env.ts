const REQUIRED_ENV = [
  'PORT',
  'SERVICE_NAME',
  'LOGGING_SERVICE_URL',
  'LOGGING_SERVICE_API_PATH',
  'NOTIFICATION_SERVICE_URL',
  'NOTIFICATION_SERVICE_TIMEOUT',
  'NOTIFICATION_RETRY_MAX_ATTEMPTS',
  'NOTIFICATION_RETRY_DELAY_MS',
];

export function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
