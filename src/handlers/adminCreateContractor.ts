import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireAdminSession } from '../utils/sessionAuth';
import { createContractor } from '../services/cognitoContractors';
import { badRequest, forbidden, internalError, ok } from '../utils/responses';
import { getAuthorizationHeader } from '../utils/apiGateway';
import { validateCreateContractorRequest } from '../utils/validation';
import { validateEnvironmentVariables } from '../config/validation';
import { ValidationError, AuthenticationError, AuthorizationError, ConflictError, ExternalServiceError } from '../utils/errors';
import { logContractorCreated } from '../utils/userAuditLogger';
import { withAdminRateLimit } from '../utils/rateLimiter';

// Validate environment variables at startup
validateEnvironmentVariables();

const createContractorHandler = async (
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

    const body = validateCreateContractorRequest(parsedBody);

    const contractor = await createContractor(process.env.COGNITO_CONTRACTOR_USER_POOL_ID ?? '', body);

    // Log audit event
    logContractorCreated(contractor, session.sub, 'admin');

    return ok(contractor);
  } catch (error) {
    console.error('Error creating contractor', error);

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
        return badRequest('A contractor with this email already exists');
      }
      // Handle external service errors
      if (error instanceof ExternalServiceError) {
        return internalError('External service error while creating contractor');
      }
    }

    return internalError('Unable to create contractor');
  }
};

export const handler = withAdminRateLimit(createContractorHandler);
