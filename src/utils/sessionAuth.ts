import { getSessionById } from '../db/dynamodb/sessionsRepository';
import { verifySessionTokenPayload } from './sessionToken';
import { createHash } from 'crypto';

export interface ValidatedSession {
  sub: string;
  sessionId: string;
  email?: string;
  persona: 'manager' | 'contractor' | 'admin';
}

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

export const validateSessionToken = async (token: string): Promise<ValidatedSession> => {
  const payload = verifySessionTokenPayload(token);
  const { sub, sessionId } = payload;
  const session = await getSessionById(sub, sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const expectedTokenHash = createHash('sha256').update(token).digest('hex');
  if (session.TokenHash !== expectedTokenHash) {
    throw new Error('Invalid session token');
  }

  if (session.LoggedOutAt) {
    throw new Error('Session logged out');
  }

  if (session.ExpiresAt <= nowInSeconds()) {
    throw new Error('Session expired');
  }

  return { sub: payload.sub, sessionId: payload.sessionId, email: session.Email, persona: session.Persona };
};
