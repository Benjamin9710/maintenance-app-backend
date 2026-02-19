import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Extracts the Authorization header from an API Gateway event.
 * Handles case-insensitive header names and returns null if not found.
 */
export const getAuthorizationHeader = (event: APIGatewayProxyEventV2): string | null => {
  const headers = event.headers ?? {};

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      return value ?? null;
    }
  }

  return null;
};
