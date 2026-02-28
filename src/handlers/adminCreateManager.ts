import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireAdminSession } from '../utils/sessionAuth';
import { createManager } from '../services/cognitoManagers';
import { badRequest, forbidden, internalError, ok } from '../utils/responses';
import { getAuthorizationHeader } from '../utils/apiGateway';
import { validateCreateManagerRequest } from '../utils/validation';
import { validateEnvironmentVariables } from '../config/validation';
import { ValidationError, AuthenticationError, AuthorizationError, ConflictError, ExternalServiceError } from '../utils/errors';
import { logManagerCreated } from '../utils/userAuditLogger';
import { withAdminRateLimit } from '../utils/rateLimiter';

// Validate environment variables at startup
validateEnvironmentVariables();

const createManagerHandler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const authHeader = getAuthorizationHeader(event);
    const session = await requireAdminSession(authHeader);

    if (!event.body) {
      return badRequest('Missing request body');
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest('Invalid JSON body');
    }

    const body = validateCreateManagerRequest(parsedBody);

    const manager = await createManager(process.env.COGNITO_MANAGER_USER_POOL_ID ?? '', body);

    // Log audit event
    logManagerCreated(manager, session.sub, 'admin');

    return ok(manager);
  } catch (error) {
    console.error('Error creating manager', error);

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
      // Handle conflict errors (user already exists)
      if (error instanceof ConflictError || error.message.includes('UsernameExistsException')) {
        return badRequest('A manager with this email already exists');
      }
      // Handle external service errors
      if (error instanceof ExternalServiceError) {
        return internalError('External service error while creating manager');
      }
    }

    return internalError('Unable to create manager');
  }
};

export const handler = withAdminRateLimit(createManagerHandler);
