import { handler } from '../../src/handlers/authLogout';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/db/dynamodb/sessionsRepository');
jest.mock('../../src/utils/sessionAuth');

describe('authLogout handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 for missing Authorization header', async () => {
    const event = {} as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
  });

  it('returns 401 for invalid Authorization header', async () => {
    const event = { headers: { authorization: 'invalid' } } as unknown as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid Authorization header',
    });
  });

  it('returns 401 for invalid session token', async () => {
    const { validateSessionToken } = require('../../src/utils/sessionAuth');
    validateSessionToken.mockRejectedValue(new Error('Invalid token'));

    const event = { headers: { authorization: 'Bearer invalid' } } as unknown as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid session token',
    });
  });

  it('logs out valid session', async () => {
    const { validateSessionToken } = require('../../src/utils/sessionAuth');
    const { markSessionLoggedOut } = require('../../src/db/dynamodb/sessionsRepository');

    validateSessionToken.mockResolvedValue({ sub: 'user123', sessionId: 'session-123' });
    markSessionLoggedOut.mockResolvedValue(true);

    const event = { headers: { authorization: 'Bearer valid-token' } } as unknown as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual({
      status: 'logged_out',
    });
  });

  it('returns 401 for session not found', async () => {
    const { validateSessionToken } = require('../../src/utils/sessionAuth');
    const { markSessionLoggedOut } = require('../../src/db/dynamodb/sessionsRepository');

    validateSessionToken.mockResolvedValue({ sub: 'user123', sessionId: 'session-123' });
    markSessionLoggedOut.mockResolvedValue(false);

    const event = { headers: { authorization: 'Bearer token' } } as unknown as APIGatewayProxyEventV2;
    const res = await handler(event);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid session token',
    });
  });
});
