import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  getPropertyById,
  type Property,
} from "../db/postgres/propertiesRepository";
import { requireAdminSession } from "../utils/sessionAuth";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  notFound,
  ok,
} from "../utils/responses";
import { getAuthorizationHeader } from "../utils/apiGateway";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../utils/errors";
import { logPropertyRead, logPropertyReadFailed } from "../utils/auditLogger";
import { withAdminRateLimit } from "../utils/rateLimiter";

// Transform database property to frontend format
const transformPropertyForFrontend = (property: Property) => {
  const {
    owner_manager_sub,
    address_line1,
    address_line2,
    created_at,
    updated_at,
    archived_at,
    ...rest
  } = property;

  return {
    ...rest,
    ownerManagerSub: owner_manager_sub,
    addressLine1: address_line1,
    addressLine2: address_line2,
    createdAt: created_at,
    updatedAt: updated_at,
    archivedAt: archived_at,
  };
};

export const handler = withAdminRateLimit(
  async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
      const authHeader = getAuthorizationHeader(event);
      const session = await requireAdminSession(authHeader);

      // Get property ID from path parameters
      const propertyId = event.pathParameters?.propertyId;
      if (!propertyId) {
        return badRequest("Property ID is required");
      }

      // Get the property (admin can access any property)
      const property = await getPropertyById(propertyId);
      if (!property) {
        return notFound("Property not found");
      }

      // Log audit event
      logPropertyRead(property, session.sub, "admin");

      return ok(transformPropertyForFrontend(property));
    } catch (error) {
      console.error("Error getting property", error);

      // Log failed operation for audit
      const propertyId = event.pathParameters?.propertyId || "unknown";
      let errorReason = "Unknown error";
      const userId = "unknown";

      if (error instanceof Error) {
        errorReason = error.message;

        // Handle validation errors
        if (error instanceof ValidationError) {
          logPropertyReadFailed(
            propertyId,
            userId,
            "admin",
            `Validation failed: ${error.message}`,
          );
          return badRequest(error.message);
        }
        // Handle conflict errors
        if (error instanceof ConflictError) {
          logPropertyReadFailed(
            propertyId,
            userId,
            "admin",
            `Conflict: ${error.message}`,
          );
          return conflict(error.message);
        }
        // Handle authentication errors
        if (error instanceof AuthenticationError) {
          logPropertyReadFailed(
            propertyId,
            userId,
            "admin",
            `Authentication failed: ${error.message}`,
          );
          if (
            error.message.includes("Missing Authorization header") ||
            error.message.includes("Invalid Authorization header")
          ) {
            return badRequest("Missing or invalid Authorization header");
          }
          return badRequest(error.message);
        }
        // Handle authorization errors
        if (error instanceof AuthorizationError) {
          logPropertyReadFailed(
            propertyId,
            userId,
            "admin",
            `Authorization failed: ${error.message}`,
          );
          return forbidden("Admin access required");
        }
        // Handle not found errors
        if (error instanceof NotFoundError) {
          logPropertyReadFailed(
            propertyId,
            userId,
            "admin",
            `Not found: ${error.message}`,
          );
          return notFound("Property not found");
        }
      }

      // Log generic error
      logPropertyReadFailed(
        propertyId,
        userId,
        "admin",
        `Generic error: ${errorReason}`,
      );
      return internalError("Unable to get property");
    }
  },
);
