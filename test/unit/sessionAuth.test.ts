import { validateSessionToken } from '../../src/utils/sessionAuth';

jest.mock('../../src/db/dynamodb/sessionsRepository');
jest.mock('../../src/utils/sessionToken');

const { createHash } = require('crypto');

describe('sessionAuth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('validateSessionToken', () => {
    it('returns validated session for valid token', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');
      const { getSessionById } = require('../../src/db/dynamodb/sessionsRepository');

      verifySessionTokenPayload.mockReturnValue({ sub: 'user123', sessionId: 'session-123' });

      getSessionById.mockResolvedValue({
        PK: 'USER#user123',
        SK: 'SESSION#session-123',
        TokenHash: createHash('sha256').update('valid-token').digest('hex'),
        ExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await validateSessionToken('valid-token');
      expect(result).toEqual({ sub: 'user123', sessionId: 'session-123', email: undefined });
    });

    it('throws error for invalid token payload', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');

      verifySessionTokenPayload.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(validateSessionToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('throws error if session not found', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');
      const { getSessionById } = require('../../src/db/dynamodb/sessionsRepository');

      verifySessionTokenPayload.mockReturnValue({ sub: 'user123', sessionId: 'session-123' });
      getSessionById.mockResolvedValue(null);

      await expect(validateSessionToken('token')).rejects.toThrow('Session not found');
    });

    it('throws error for invalid token hash', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');
      const { getSessionById } = require('../../src/db/dynamodb/sessionsRepository');

      verifySessionTokenPayload.mockReturnValue({ sub: 'user123', sessionId: 'session-123' });
      getSessionById.mockResolvedValue({
        TokenHash: 'wrong-hash',
        ExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(validateSessionToken('token')).rejects.toThrow('Invalid session token');
    });

    it('throws error for logged out session', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');
      const { getSessionById } = require('../../src/db/dynamodb/sessionsRepository');

      verifySessionTokenPayload.mockReturnValue({ sub: 'user123', sessionId: 'session-123' });
      getSessionById.mockResolvedValue({
        TokenHash: createHash('sha256').update('token').digest('hex'),
        ExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        LoggedOutAt: '2023-01-01T00:00:00Z',
      });

      await expect(validateSessionToken('token')).rejects.toThrow('Session logged out');
    });

    it('throws error for expired session', async () => {
      const { verifySessionTokenPayload } = require('../../src/utils/sessionToken');
      const { getSessionById } = require('../../src/db/dynamodb/sessionsRepository');

      verifySessionTokenPayload.mockReturnValue({ sub: 'user123', sessionId: 'session-123' });
      getSessionById.mockResolvedValue({
        TokenHash: createHash('sha256').update('token').digest('hex'),
        ExpiresAt: Math.floor(Date.now() / 1000) - 1,
      });

      await expect(validateSessionToken('token')).rejects.toThrow('Session expired');
    });
  });
});
