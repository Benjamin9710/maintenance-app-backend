import { handler } from '../../src/handlers/authSession';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(),
  },
}));
jest.mock('../../src/db/dynamodb/sessionsRepository');
jest.mock('../../src/utils/sessionToken');

describe('authSession handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 for missing request body', async () => {
    const event = {} as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Bad Request',
      message: 'Missing request body',
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const event = { body: 'invalid json' } as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Bad Request',
      message: 'Invalid JSON body',
    });
  });

  it('returns 400 for missing idToken', async () => {
    const event = { body: JSON.stringify({}) } as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Bad Request',
      message: 'idToken is required',
    });
  });

  it('returns 401 for invalid ID token', async () => {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    CognitoJwtVerifier.create.mockReturnValue({
      verify: jest.fn().mockRejectedValue(new Error('Invalid token')),
    });

    const event = { body: JSON.stringify({ idToken: 'invalid' }) } as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Unauthorized',
    });
  });

  it('creates session for valid ID token', async () => {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    const { createSessionForUser } = require('../../src/db/dynamodb/sessionsRepository');
    const { createSessionToken } = require('../../src/utils/sessionToken');

    CognitoJwtVerifier.create.mockReturnValue({
      verify: jest.fn().mockResolvedValue({ sub: 'user123', email: 'user@example.com' }),
    });

    createSessionToken.mockReturnValue({
      token: 'session-token',
      sessionId: 'session-123',
      tokenHash: 'hash123',
      expiresAt: '2023-01-01T00:00:00.000Z',
    });

    createSessionForUser.mockResolvedValue(undefined);

    const event = { body: JSON.stringify({ idToken: 'valid-token' }) } as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body).toEqual({
      sessionToken: 'session-token',
      expiresAt: '2023-01-01T00:00:00.000Z',
      persona: 'manager',
      user: {
        sub: 'user123',
        email: 'user@example.com',
        isProfileComplete: false,
      },
    });
  });

  it('creates session for valid contractor ID token', async () => {
    const { CognitoJwtVerifier } = require('aws-jwt-verify');
    const { createSessionForUser } = require('../../src/db/dynamodb/sessionsRepository');
    const { createSessionToken } = require('../../src/utils/sessionToken');

    // Mock manager verifier to fail, contractor to succeed
    CognitoJwtVerifier.create
      .mockReturnValueOnce({
        verify: jest.fn().mockRejectedValue(new Error('Invalid token')),
      })
      .mockReturnValueOnce({
        verify: jest.fn().mockResolvedValue({ sub: 'user456', email: 'contractor@example.com' }),
      });

    createSessionToken.mockReturnValue({
      token: 'session-token',
      sessionId: 'session-456',
      tokenHash: 'hash456',
      expiresAt: '2023-01-01T00:00:00.000Z',
    });

    createSessionForUser.mockResolvedValue(undefined);

    const event = { body: JSON.stringify({ idToken: 'contractor-token' }) } as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body).toEqual({
      sessionToken: 'session-token',
      expiresAt: '2023-01-01T00:00:00.000Z',
      persona: 'contractor',
      user: {
        sub: 'user456',
        email: 'contractor@example.com',
        isProfileComplete: false,
      },
    });
  });
});
