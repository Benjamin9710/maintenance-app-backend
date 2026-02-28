import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  createProperty,
  type Property,
} from "../db/postgres/propertiesRepository";
import { requireAdminSession } from "../utils/sessionAuth";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  ok,
} from "../utils/responses";
import { getAuthorizationHeader } from "../utils/apiGateway";
import { validateCreatePropertyRequest } from "../utils/validation";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
} from "../utils/errors";
import { logPropertyCreated } from "../utils/auditLogger";
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

const createPropertyHandler = async (
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

    if (!event.body) {
      return badRequest("Missing request body");
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest("Invalid JSON body");
    }

    const propertyData = validateCreatePropertyRequest(parsedBody);

    const property = await createProperty(managerSub, propertyData);

    // Log audit event
    logPropertyCreated(property, session.sub, "admin");

    return ok(transformPropertyForFrontend(property));
  } catch (error) {
    console.error("Error creating property", error);

    if (error instanceof Error) {
      // Handle validation errors
      if (error instanceof ValidationError) {
        return badRequest(error.message);
      }
      // Handle conflict errors (unique constraint violations)
      if (error instanceof ConflictError) {
        return conflict(error.message);
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
    }

    return internalError("Unable to create property");
  }
};

export const handler = withAdminRateLimit(createPropertyHandler);
