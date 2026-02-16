import { createSessionForUser, getSessionById, markSessionLoggedOut } from '../../src/db/dynamodb/sessionsRepository';

jest.mock('../../src/db/dynamodb/client');

describe('sessionsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSessionForUser', () => {
    it('creates a session record', async () => {
      const { getClient } = require('../../src/db/dynamodb/client');
      const mockClient = { send: jest.fn() };
      getClient.mockReturnValue(mockClient);

      await createSessionForUser('user123', 'session-123', 'hash123', 1640995200, null, 'manager');

      const sentCommand = mockClient.send.mock.calls[0][0];
      expect(sentCommand.input).toEqual(
        expect.objectContaining({
          TableName: 'backend-app-sessions',
          Item: expect.objectContaining({
            PK: 'USER#user123',
            SK: 'SESSION#session-123',
            SessionId: 'session-123',
            UserSub: 'user123',
            TokenHash: 'hash123',
            ExpiresAt: 1640995200,
            Persona: 'manager',
          }),
        }),
      );
    });
  });

  describe('getSessionById', () => {
    it('returns session record if found', async () => {
      const { getClient } = require('../../src/db/dynamodb/client');
      const mockClient = {
        send: jest.fn().mockResolvedValue({
          Item: {
            PK: 'USER#user123',
            SK: 'SESSION#session-123',
            SessionId: 'session-123',
            UserSub: 'user123',
            TokenHash: 'hash123',
            ExpiresAt: 1640995200,
            Persona: 'manager',
          },
        }),
      };
      getClient.mockReturnValue(mockClient);

      const result = await getSessionById('user123', 'session-123');
      expect(result).toEqual({
        PK: 'USER#user123',
        SK: 'SESSION#session-123',
        SessionId: 'session-123',
        UserSub: 'user123',
        TokenHash: 'hash123',
        ExpiresAt: 1640995200,
        Persona: 'manager',
      });
    });

    it('returns null if not found', async () => {
      const { getClient } = require('../../src/db/dynamodb/client');
      const mockClient = { send: jest.fn().mockResolvedValue({}) };
      getClient.mockReturnValue(mockClient);

      const result = await getSessionById('user123', 'session-123');
      expect(result).toBeNull();
    });
  });

  describe('markSessionLoggedOut', () => {
    it('marks session as logged out', async () => {
      const { getClient } = require('../../src/db/dynamodb/client');
      const mockClient = { send: jest.fn().mockResolvedValue({}) };
      getClient.mockReturnValue(mockClient);

      const result = await markSessionLoggedOut('user123', 'session-123', '2023-01-01T00:00:00Z');
      expect(result).toBe(true);
      const sentCommand = mockClient.send.mock.calls[0][0];
      expect(sentCommand.input).toEqual(
        expect.objectContaining({
          TableName: 'backend-app-sessions',
          Key: { PK: 'USER#user123', SK: 'SESSION#session-123' },
          UpdateExpression: 'SET LoggedOutAt = :loggedOutAt, ExpiresAt = :expiresNow',
        }),
      );
    });

    it('returns false if session not found', async () => {
      const { getClient } = require('../../src/db/dynamodb/client');
      const conditionalError = Object.assign(new Error('ConditionalCheckFailedException'), {
        name: 'ConditionalCheckFailedException',
      });
      const mockClient = {
        send: jest.fn().mockRejectedValue(conditionalError),
      };
      getClient.mockReturnValue(mockClient);

      const result = await markSessionLoggedOut('user123', 'session-123', '2023-01-01T00:00:00Z');
      expect(result).toBe(false);
    });
  });
});
