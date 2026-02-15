import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

const base64UrlEncode = (buffer: Buffer): string => {
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64UrlDecode = (value: string): Buffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (normalized.length % 4 || 4);
  const padded = normalized + '='.repeat(padding);
  return Buffer.from(padded, 'base64');
};

export interface SessionTokenPayload {
  sub: string;
  sessionId: string;
}

export const createSessionToken = (sub: string): { token: string; sessionId: string; tokenHash: string; expiresAt: string } => {
  const sessionId = randomUUID();
  const payload: SessionTokenPayload = { sub, sessionId };
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const token = encodedPayload;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAt + SESSION_TTL_SECONDS;
  const expiresAt = new Date(expiresAtSeconds * 1000).toISOString();

  return { token, sessionId, tokenHash, expiresAt };
};

export const verifySessionTokenPayload = (token: string): SessionTokenPayload => {
  try {
    const decoded = base64UrlDecode(token);
    const payload: SessionTokenPayload = JSON.parse(decoded.toString('utf8'));
    if (!payload.sub || !payload.sessionId) {
      throw new Error('Invalid session token payload');
    }
    return payload;
  } catch {
    throw new Error('Invalid session token format');
  }
};
