import { LoggerService } from '@nestjs/common';
import { RequestContext } from './request-context';

type LogMeta = Record<string, unknown> | undefined;

export class MarathonLogger implements LoggerService {
  private readonly serviceName = process.env.SERVICE_NAME;
  private readonly loggingUrl = process.env.LOGGING_SERVICE_URL;
  private readonly loggingPath = process.env.LOGGING_SERVICE_API_PATH;
  private readonly loggingTimeoutMs = Math.min(
    Number(process.env.LOGGING_SERVICE_TIMEOUT) || 2000,
    5000,
  );
  private readonly loggingFallbackUrls = this.getLoggingFallbackUrls();

  log(message: unknown, context?: string): void {
    this.emit('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.emit('error', message, context, { trace });
  }

  warn(message: unknown, context?: string): void {
    this.emit('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.emit('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.emit('verbose', message, context);
  }

  private emit(level: string, message: unknown, context?: string, meta?: LogMeta): void {
    if (!this.loggingPath || !this.serviceName || this.loggingFallbackUrls.length === 0) {
      return;
    }
    try {
      const requestContext = RequestContext.get();
      const payload = {
        service: this.serviceName,
        level,
        message: String(message),
        context,
        meta: {
          ...meta,
          requestId: requestContext?.requestId,
          method: requestContext?.method,
          path: requestContext?.path,
          ip: requestContext?.ip,
          userId: requestContext?.userId,
        },
        timestamp: new Date().toISOString(),
      };

      // Fire-and-forget: try known hostnames so blue/green color switches do not break logging.
      void (async () => {
        for (const baseUrl of this.loggingFallbackUrls) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), this.loggingTimeoutMs);
          try {
            const response = await fetch(`${baseUrl}${this.loggingPath}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            if (response.ok) {
              clearTimeout(timeout);
              return;
            }
          } catch {
            // Try next candidate URL.
          } finally {
            clearTimeout(timeout);
          }
        }
      })();
    } catch (error) {
      // Silently fail if logging fails to prevent logging errors from breaking the app
    }
  }

  private getLoggingFallbackUrls(): string[] {
    const configured = this.loggingUrl?.trim();
    if (!configured) {
      return [];
    }

    const extra = (process.env.LOGGING_SERVICE_URL_FALLBACKS || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const candidates = new Set<string>([configured, ...extra]);

    try {
      const url = new URL(configured);
      const host = url.hostname;
      const protocol = url.protocol;
      const port = url.port ? `:${url.port}` : '';
      const base = `${protocol}//`;

      // Support deployments where logging backend container has color-specific DNS names.
      if (host === 'logging-microservice') {
        candidates.add(`${base}logging-microservice-backend-green${port}`);
        candidates.add(`${base}logging-microservice-backend-blue${port}`);
      } else if (host === 'logging-microservice-backend-green') {
        candidates.add(`${base}logging-microservice-backend-blue${port}`);
        candidates.add(`${base}logging-microservice${port}`);
      } else if (host === 'logging-microservice-backend-blue') {
        candidates.add(`${base}logging-microservice-backend-green${port}`);
        candidates.add(`${base}logging-microservice${port}`);
      }
    } catch {
      // Keep configured URL and explicit fallbacks only.
    }

    return [...candidates];
  }
}
