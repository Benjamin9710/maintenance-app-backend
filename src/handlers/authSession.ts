import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { createSessionForUser } from '../db/dynamodb/sessionsRepository';
import { createSessionToken } from '../utils/sessionToken';
import { badRequest, ok, unauthorized } from '../utils/responses';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const managerVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_MANAGER_USER_POOL_ID ?? '',
    tokenUse: 'id',
    clientId: process.env.COGNITO_MANAGER_USER_POOL_CLIENT_ID ?? '',
  });

  const contractorVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_CONTRACTOR_USER_POOL_ID ?? '',
    tokenUse: 'id',
    clientId: process.env.COGNITO_CONTRACTOR_USER_POOL_CLIENT_ID ?? '',
  });

  try {
    if (!event.body) {
      return badRequest('Missing request body');
    }

    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest('Invalid JSON body');
    }

    const { idToken } = parsedBody as { idToken?: string };

    if (!idToken) {
      return badRequest('idToken is required');
    }

    let claims: any;
    let persona: 'manager' | 'contractor';

    try {
      claims = await managerVerifier.verify(idToken);
      persona = 'manager';
    } catch (managerError) {
      try {
        claims = await contractorVerifier.verify(idToken);
        persona = 'contractor';
      } catch (contractorError) {
        return unauthorized('Unable to create session from ID token');
      }
    }
    const sub = claims.sub as string | undefined;
    const email = (claims as { email?: string }).email ?? null;

    if (!sub) {
      return unauthorized('Invalid ID token: missing sub');
    }

    const { token: sessionToken, sessionId, tokenHash, expiresAt } = createSessionToken(sub);

    const expiresAtSeconds = Math.floor(new Date(expiresAt).getTime() / 1000);

    await createSessionForUser(sub, sessionId, tokenHash, expiresAtSeconds, email, persona);

    return ok({
      sessionToken,
      expiresAt,
      persona,
      user: {
        sub,
        email: (claims as { email?: string }).email ?? null,
        isProfileComplete: false, // No user DB yet
      },
    });
  } catch (error) {
    console.error('Error creating API session', error);

    return unauthorized('Unable to create session from ID token');
  }
};
