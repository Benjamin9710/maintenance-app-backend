import { APIGatewayProxyEventV2 } from 'aws-lambda';

interface JWTAuthorizer {
  jwt: {
    claims: Record<string, any>;
    scopes: string[];
  };
}

interface APIGatewayProxyEventV2WithAuthorizer extends APIGatewayProxyEventV2 {
  requestContext: APIGatewayProxyEventV2['requestContext'] & {
    authorizer: JWTAuthorizer;
  };
}

export interface CognitoClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  exp: number;
  iat: number;
  given_name: string;
  family_name: string;
}

export function extractCognitoClaims(event: APIGatewayProxyEventV2): CognitoClaims | null {
  try {
    const authorizer = (event as APIGatewayProxyEventV2WithAuthorizer).requestContext.authorizer;
    if (!authorizer?.jwt?.claims) {
      return null;
    }

    const claims = authorizer.jwt.claims as Record<string, any>;

    return {
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified === true || claims.email_verified === 'true',
      exp: Number(claims.exp),
      iat: Number(claims.iat),
      given_name: claims.given_name,
      family_name: claims.family_name,
    };
  } catch {
    return null;
  }
}
