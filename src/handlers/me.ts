import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { validateSessionToken } from '../utils/sessionAuth';
import { ok, unauthorized } from '../utils/responses';

const getAuthorizationHeader = (event: APIGatewayProxyEventV2): string | null => {
  const headers = event.headers ?? {};

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      return value ?? null;
    }
  }

  return null;
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const authHeader = getAuthorizationHeader(event);

  if (!authHeader) {
    return unauthorized('Missing Authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return unauthorized('Invalid Authorization header');
  }

  try {
    const validated = await validateSessionToken(token);

    return ok({
      sub: validated.sub,
      email: validated.email,
      email_verified: false,
      given_name: null,
      family_name: null,
      exp: 0,
      iat: 0,
    });
  } catch (error) {
    console.error('Session validation failed', error);
    return unauthorized('Invalid session token');
  }
};
