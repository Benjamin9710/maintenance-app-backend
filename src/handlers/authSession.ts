import { CognitoJwtVerifier } from "aws-jwt-verify";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { createSessionForUser } from "../db/dynamodb/sessionsRepository";
import { createSessionToken } from "../utils/sessionToken";
import { badRequest, ok, unauthorized } from "../utils/responses";

interface JwtClaims {
  sub: string;
  email?: string;
  [key: string]: unknown; // Allow other claim properties
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const managerVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_MANAGER_USER_POOL_ID ?? "",
    tokenUse: "id",
    clientId: process.env.COGNITO_MANAGER_USER_POOL_CLIENT_ID ?? "",
  });

  const contractorVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_CONTRACTOR_USER_POOL_ID ?? "",
    tokenUse: "id",
    clientId: process.env.COGNITO_CONTRACTOR_USER_POOL_CLIENT_ID ?? "",
  });

  const adminVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_ADMIN_USER_POOL_ID ?? "",
    tokenUse: "id",
    clientId: process.env.COGNITO_ADMIN_USER_POOL_CLIENT_ID ?? "",
  });

  try {
    if (!event.body) {
      return badRequest("Missing request body");
    }

    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { idToken } = parsedBody as { idToken?: string };

    if (!idToken) {
      return badRequest("idToken is required");
    }

    let claims: JwtClaims;
    let persona: "manager" | "contractor" | "admin";

    try {
      claims = await managerVerifier.verify(idToken);
      persona = "manager";
    } catch {
      try {
        claims = await contractorVerifier.verify(idToken);
        persona = "contractor";
      } catch {
        try {
          claims = await adminVerifier.verify(idToken);
          persona = "admin";
        } catch {
          return unauthorized("Unable to create session from ID token");
        }
      }
    }
    const sub = claims.sub;
    const email = claims.email ?? null;

    if (!sub) {
      return unauthorized("Invalid ID token: missing sub");
    }

    const {
      token: sessionToken,
      sessionId,
      tokenHash,
      expiresAt,
    } = createSessionToken(sub);

    const expiresAtSeconds = Math.floor(new Date(expiresAt).getTime() / 1000);

    await createSessionForUser(
      sub,
      sessionId,
      tokenHash,
      expiresAtSeconds,
      email,
      persona,
    );

    return ok({
      sessionToken,
      expiresAt,
      persona,
      user: {
        sub,
        email: claims.email ?? null,
        isProfileComplete: false, // No user DB yet
      },
    });
  } catch (error) {
    console.error("Error creating API session", error);

    return unauthorized("Unable to create session from ID token");
  }
};
