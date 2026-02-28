import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireAdminSession } from '../utils/sessionAuth';
import { listManagers } from '../services/cognitoManagers';
import { badRequest, forbidden, internalError, ok } from '../utils/responses';
import { getAuthorizationHeader } from '../utils/apiGateway';
import { validateEnvironmentVariables } from '../config/validation';
import { ValidationError, AuthenticationError, AuthorizationError } from '../utils/errors';
import { logManagerList } from '../utils/userAuditLogger';
import { withAdminRateLimit } from '../utils/rateLimiter';

// Validate environment variables at startup
validateEnvironmentVariables();

/**
 * Parses pagination query parameters from the event.
 */
const parsePaginationParams = (event: APIGatewayProxyEventV2) => {
  const queryParams = event.queryStringParameters ?? {};
  
  const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;
  const paginationToken = queryParams.paginationToken ?? undefined;
  
  // Validate limit
  if (limit !== undefined) {
    if (isNaN(limit) || limit < 1 || limit > 60) {
      throw new ValidationError('Limit must be between 1 and 60');
    }
  }
  
  return { limit, paginationToken };
};

const listManagersHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const authHeader = getAuthorizationHeader(event);
    const session = await requireAdminSession(authHeader);

    const paginationOptions = parsePaginationParams(event);
    const result = await listManagers(process.env.COGNITO_MANAGER_USER_POOL_ID ?? '', paginationOptions);

    // Log audit event
    logManagerList(result.managers.length, !!(paginationOptions.limit || paginationOptions.paginationToken), session.sub, 'admin');

    return ok(result);
  } catch (error) {
    console.error('Error listing managers', error);

    if (error instanceof Error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        return badRequest(error.message);
      }
      // Handle authentication errors
      if (error instanceof AuthenticationError) {
        if (error.message.includes('Missing Authorization header') || error.message.includes('Invalid Authorization header')) {
          return badRequest('Missing or invalid Authorization header');
        }
        return badRequest(error.message);
      }
      // Handle authorization errors
      if (error instanceof AuthorizationError) {
        return forbidden('Admin access required');
      }
    }

    return internalError('Unable to list managers');
  }
};

export const handler = withAdminRateLimit(listManagersHandler);
