import { handler } from '../../src/handlers/me';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('me handler', () => {
  it('returns user identity when JWT claims are present', async () => {
    const mockEvent = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: 'user-123',
              email: 'user@example.com',
              email_verified: 'true',
              exp: '1640995200',
              iat: '1640991600',
              given_name: 'John',
              family_name: 'Doe',
            },
          },
        },
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
      email_verified: true,
      exp: 1640995200,
      iat: 1640991600,
      given_name: 'John',
      family_name: 'Doe',
    });
  });

  it('returns 401 when no JWT claims are present', async () => {
    const mockEvent = {
      requestContext: {},
    } as unknown as APIGatewayProxyEventV2;

    const res = await handler(mockEvent);
    expect(res.statusCode).toBe(401);
    if (!res.body) {
      throw new Error('Response body is undefined');
    }
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });
});
