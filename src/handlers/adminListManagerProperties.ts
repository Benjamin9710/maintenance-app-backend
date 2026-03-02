import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  listPropertiesByOwner,
  type Property,
} from "../db/postgres/propertiesRepository";
import { requireAdminSession } from "../utils/sessionAuth";
import { badRequest, forbidden, internalError, ok } from "../utils/responses";
import { getAuthorizationHeader } from "../utils/apiGateway";
import { logPropertyList } from "../utils/auditLogger";
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
    archivedAt: archived_at || null, // Convert undefined to null for consistent JSON
  };
};

export const handler = withAdminRateLimit(
  async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
      const authHeader = getAuthorizationHeader(event);
      const session = await requireAdminSession(authHeader);

      // Get manager sub from path parameters
      const managerSub = event.pathParameters?.managerSub;
      if (!managerSub) {
        return badRequest("Manager sub is required");
      }

      // Parse query parameters for includeArchived option
      const includeArchived =
        event.queryStringParameters?.includeArchived === "true";

      const properties = await listPropertiesByOwner(managerSub, {
        includeArchived,
      });

      // Log audit event
      logPropertyList(
        managerSub,
        properties.length,
        includeArchived,
        session.sub,
        "admin",
      );

      return ok({ properties: properties.map(transformPropertyForFrontend) });
    } catch (error) {
      console.error("Error listing properties", error);

      // Use type guards for proper error handling
      if (error && typeof error === "object") {
        // Handle authentication errors
        if ("message" in error && typeof error.message === "string") {
          if (
            error.message.includes("Missing Authorization header") ||
            error.message.includes("Invalid Authorization header")
          ) {
            return badRequest("Missing or invalid Authorization header");
          }

          // Check for specific error types by their properties
          if (error.constructor.name === "AuthenticationError") {
            return badRequest(error.message);
          }

          if (error.constructor.name === "AuthorizationError") {
            return forbidden("Admin access required");
          }
        }
      }

      return internalError("Unable to list properties");
    }
  },
);
