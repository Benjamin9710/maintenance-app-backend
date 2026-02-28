import { extractCognitoClaims } from '../../src/config/auth';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('extractCognitoClaims', () => {
  it('extracts claims correctly from valid JWT authorizer', () => {
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

    const claims = extractCognitoClaims(mockEvent);
    expect(claims).toEqual({
      sub: 'user-123',
      email: 'user@example.com',
      email_verified: true,
      exp: 1640995200,
      iat: 1640991600,
      given_name: 'John',
      family_name: 'Doe',
    });
  });

  it('returns null when no authorizer is present', () => {
    const mockEvent = {
      requestContext: {},
    } as unknown as APIGatewayProxyEventV2;

    const claims = extractCognitoClaims(mockEvent);
    expect(claims).toBeNull();
  });

  it('returns null when JWT claims are missing', () => {
    const mockEvent = {
      requestContext: {
        authorizer: {},
      },
    } as unknown as APIGatewayProxyEventV2;

    const claims = extractCognitoClaims(mockEvent);
    expect(claims).toBeNull();
  });

  it('handles boolean email_verified correctly', () => {
    const mockEvent = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: 'user-123',
              email: 'user@example.com',
              email_verified: true, // boolean instead of string
              exp: '1640995200',
              iat: '1640991600',
              given_name: 'John',
              family_name: 'Doe',
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2;

    const claims = extractCognitoClaims(mockEvent);
    expect(claims?.email_verified).toBe(true);
  });
});
