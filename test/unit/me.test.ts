import { handler } from '../../src/handlers/me';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/utils/sessionAuth');

describe('me handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns user identity when session token is valid', async () => {
    const { validateSessionToken } = require('../../src/utils/sessionAuth');
    validateSessionToken.mockResolvedValue({ sub: 'user-123', email: 'user@example.com' });

    const mockEvent = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as APIGatewayProxyEventV2;

    const res = await handler(mockEvent);
    expect(res.statusCode).toBe(200);
    if (!res.body) {
      throw new Error('Response body is undefined');
    }
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      sub: 'user-123',
      email: 'user@example.com',
      email_verified: false,
      given_name: null,
      family_name: null,
      exp: 0,
      iat: 0,
    });
  });

  it('returns 401 when no Authorization header is present', async () => {
    const mockEvent = {} as unknown as APIGatewayProxyEventV2;

    const res = await handler(mockEvent);
    expect(res.statusCode).toBe(401);
    if (!res.body) {
      throw new Error('Response body is undefined');
    }
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });
});
