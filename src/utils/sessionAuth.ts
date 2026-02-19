import { getSessionById } from '../db/dynamodb/sessionsRepository';
import { verifySessionTokenPayload } from './sessionToken';
import { createHash } from 'crypto';
import { AuthenticationError, AuthorizationError } from './errors';

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
    throw new AuthenticationError('Session not found');
  }

  const expectedTokenHash = createHash('sha256').update(token).digest('hex');
  if (session.TokenHash !== expectedTokenHash) {
    throw new AuthenticationError('Invalid session token');
  }

  if (session.LoggedOutAt) {
    throw new AuthenticationError('Session logged out');
  }

  if (session.ExpiresAt <= nowInSeconds()) {
    throw new AuthenticationError('Session expired');
  }

  return { sub: payload.sub, sessionId: payload.sessionId, email: session.Email, persona: session.Persona };
};

export const requireAuthenticatedSession = async (authHeader: string | null | undefined): Promise<ValidatedSession> => {
  if (!authHeader) {
    throw new AuthenticationError('Missing Authorization header');
  }

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new AuthenticationError('Invalid Authorization header');
  }

  return await validateSessionToken(token);
};

export const requireAdminSession = async (authHeader: string | null | undefined): Promise<ValidatedSession> => {
  const session = await requireAuthenticatedSession(authHeader);
  if (session.persona !== 'admin') {
    throw new AuthorizationError('Forbidden');
  }
  return session;
};
