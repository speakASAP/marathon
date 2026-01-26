import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from './request-context';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationsUrl = process.env.NOTIFICATION_SERVICE_URL;
  private readonly timeoutMs = Number(process.env.NOTIFICATION_SERVICE_TIMEOUT);
  private readonly retryAttempts = Number(process.env.NOTIFICATION_RETRY_MAX_ATTEMPTS);
  private readonly retryDelayMs = Number(process.env.NOTIFICATION_RETRY_DELAY_MS);

  async send(payload: Record<string, unknown>): Promise<void> {
    if (!this.notificationsUrl) {
      this.logger.warn('Notification service URL is missing');
      return;
    }

    const endpoint = this.notificationsUrl.endsWith('/')
      ? `${this.notificationsUrl}notifications/send`
      : `${this.notificationsUrl}/notifications/send`;
    const requestId = RequestContext.get()?.requestId;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (requestId) {
      headers['x-request-id'] = requestId;
    }

    const attemptCount = Math.max(this.retryAttempts, 1);
    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      try {
        const controller = this.timeoutMs > 0 ? new AbortController() : undefined;
        if (controller) {
          setTimeout(() => controller.abort(), this.timeoutMs);
        }
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller?.signal,
        });
        if (!response.ok) {
          throw new Error(`Notification request failed with ${response.status}`);
        }
        return;
      } catch (error) {
        this.logger.error(`Notification attempt ${attempt} failed`, (error as Error).message);
        if (attempt < attemptCount && this.retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }
  }
}
