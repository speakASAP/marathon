import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const logger = new Logger('AuthClient');

const baseUrl = process.env.AUTH_SERVICE_URL;
const timeoutMs = Math.max(Number(process.env.AUTH_SERVICE_TIMEOUT) || 5000, 1000);
const portalJwtSecret = process.env.MARATHON_PORTAL_JWT_SECRET;

export type AuthUser = { id: string };

/**
 * Validates portal-issued JWT (Phase B: session user from speakasap-portal).
 * Payload must have sub (portal user id string). Same secret as portal MARATHON_PORTAL_JWT_SECRET.
 */
export function validatePortalToken(token: string): AuthUser | null {
  if (!portalJwtSecret || !token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, portalJwtSecret, { algorithms: ['HS256'] }) as { sub?: string };
    if (!payload?.sub) {
      return null;
    }
    return { id: String(payload.sub) };
  } catch {
    return null;
  }
}

/**
 * Validates JWT via auth-microservice POST /auth/validate.
 * Returns user shape { id } on success, null on failure or missing config.
 */
export async function validateToken(token: string): Promise<AuthUser | null> {
  if (!baseUrl || !token) {
    return null;
  }
  const url = baseUrl.endsWith('/')
    ? `${baseUrl}auth/validate`
    : `${baseUrl}/auth/validate`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      logger.debug(`Auth validate failed: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { valid?: boolean; user?: { id?: string } };
    if (!data?.valid || !data?.user?.id) {
      return null;
    }
    return { id: String(data.user.id) };
  } catch (e) {
    clearTimeout(t);
    logger.debug(`Auth validate error: ${(e as Error).message}`);
    return null;
  }
}
