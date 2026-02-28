import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { archiveProperty, getPropertyById } from '../db/postgres/propertiesRepository';
import { requireAdminSession } from '../utils/sessionAuth';
import { badRequest, forbidden, internalError, notFound, ok } from '../utils/responses';
import { getAuthorizationHeader } from '../utils/apiGateway';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logPropertyArchived } from '../utils/auditLogger';
import { withAdminRateLimit } from '../utils/rateLimiter';

export const handler = withAdminRateLimit(async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const authHeader = getAuthorizationHeader(event);
    const session = await requireAdminSession(authHeader);

    // Get property ID from path parameters
    const propertyId = event.pathParameters?.propertyId;
    if (!propertyId) {
      return badRequest('Property ID is required');
    }

    // Get the property first to find its owner
    const existingProperty = await getPropertyById(propertyId);
    if (!existingProperty) {
      return notFound('Property not found');
    }

    // Check if property is already archived
    if (existingProperty.archived_at) {
      return notFound('Property not found');
    }

    const property = await archiveProperty(propertyId, existingProperty.owner_manager_sub);

    // Log audit event
    logPropertyArchived(property, session.sub, 'admin');

    return ok(property);
  } catch (error) {
    console.error('Error archiving property', error);

    if (error instanceof Error) {
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
      // Handle not found or access denied errors from repository
      if (error.message.includes('Property not found') || error.message.includes('not owned by specified manager') || error.message.includes('already archived')) {
        return notFound(error.message);
      }
    }

    return internalError('Unable to archive property');
  }
});
