import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { extractCognitoClaims } from '../config/auth';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const claims = extractCognitoClaims(event);

  if (!claims) {
    return {
      statusCode: 401,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'No valid JWT claims found',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified,
      given_name: claims.given_name,
      family_name: claims.family_name,
      exp: claims.exp,
      iat: claims.iat,
    }),
  };
};
