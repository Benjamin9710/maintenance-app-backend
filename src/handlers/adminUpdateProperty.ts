import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  updateProperty,
  type Property,
} from "../db/postgres/propertiesRepository";
import { requireAdminSession } from "../utils/sessionAuth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  ok,
} from "../utils/responses";
import { getAuthorizationHeader } from "../utils/apiGateway";
import { validateUpdatePropertyRequest } from "../utils/validation";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from "../utils/errors";
import { logPropertyUpdated } from "../utils/auditLogger";
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

const updatePropertyHandler = async (
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

    if (!event.body) {
      return badRequest("Missing request body");
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest("Invalid JSON body");
    }

    const updateData = validateUpdatePropertyRequest(parsedBody);

    // For admin updates, we need to determine the owner manager sub first
    // We'll need to get the property first to find its owner, then update
    const { getPropertyById } = await import(
      "../db/postgres/propertiesRepository"
    );
    const existingProperty = await getPropertyById(propertyId);
    if (!existingProperty) {
      return notFound("Property not found");
    }

    const property = await updateProperty(
      propertyId,
      existingProperty.owner_manager_sub,
      updateData,
    );

    // Log audit event
    logPropertyUpdated(existingProperty, property, session.sub, "admin");

    return ok(transformPropertyForFrontend(property));
  } catch (error) {
    console.error("Error updating property", error);

    if (error instanceof Error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        return badRequest(error.message);
      }
      // Handle authentication errors
      if (error instanceof AuthenticationError) {
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
        return forbidden("Admin access required");
      }
      // Handle not found or access denied errors from repository
      if (
        error.message.includes("Property not found") ||
        error.message.includes("not owned by specified manager") ||
        error.message.includes("already archived")
      ) {
        return notFound(error.message);
      }
    }

    return internalError("Unable to update property");
  }
};

export const handler = withAdminRateLimit(updatePropertyHandler);
