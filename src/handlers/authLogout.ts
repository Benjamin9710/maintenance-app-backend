import { markSessionLoggedOut } from '../db/dynamodb/sessionsRepository';
import { internalError, ok, unauthorized } from '../utils/responses';
import { validateSessionToken } from '../utils/sessionAuth';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

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
  try {
    const authHeader = getAuthorizationHeader(event);

    if (!authHeader) {
      return unauthorized('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      return unauthorized('Invalid Authorization header');
    }

    let sub: string;
    let sessionId: string;

    try {
      const validated = await validateSessionToken(token);
      sub = validated.sub;
      sessionId = validated.sessionId;
    } catch (error) {
      console.warn('Invalid session token during logout', error);
      return unauthorized('Invalid session token');
    }

    const loggedOut = await markSessionLoggedOut(sub, sessionId, new Date().toISOString());

    if (!loggedOut) {
      return unauthorized('Invalid session token');
    }

    return ok({ status: 'logged_out' });
  } catch (error) {
    console.error('Error processing auth logout request', error);
    return internalError('Unable to log out');
  }
};
