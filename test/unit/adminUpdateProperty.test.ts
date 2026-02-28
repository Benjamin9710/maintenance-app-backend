import { handler } from "../../src/handlers/adminUpdateProperty";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  updateProperty,
  getPropertyById,
} from "../../src/db/postgres/propertiesRepository";
import type { Property } from "../../src/db/postgres/propertiesRepository";
import { requireAdminSession } from "../../src/utils/sessionAuth";
import { getAuthorizationHeader } from "../../src/utils/apiGateway";
import {
  AuthenticationError,
  AuthorizationError,
} from "../../src/utils/errors";

// Mock the dependencies
jest.mock("../../src/db/postgres/propertiesRepository");
jest.mock("../../src/utils/sessionAuth");
jest.mock("../../src/utils/apiGateway");
jest.mock("../../src/db/postgres/client", () => ({
  query: jest.fn(),
}));

const mockUpdateProperty = updateProperty as jest.MockedFunction<
  typeof updateProperty
>;
const mockGetPropertyById = getPropertyById as jest.MockedFunction<
  typeof getPropertyById
>;
const mockRequireAdminSession = requireAdminSession as jest.MockedFunction<
  typeof requireAdminSession
>;
const mockGetAuthorizationHeader =
  getAuthorizationHeader as jest.MockedFunction<typeof getAuthorizationHeader>;

describe("adminUpdateProperty", () => {
  const mockEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "PUT /admin/properties/{propertyId}",
    rawPath: "/admin/properties/test-property-id",
    rawQueryString: "",
    headers: { Authorization: "Bearer valid-token" },
    pathParameters: { propertyId: "test-property-id" },
    body: JSON.stringify({
      name: "Updated Property Name",
      address_line1: "456 Updated St",
    }),
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.execute-api.ap-southeast-2.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "PUT",
        path: "/admin/properties/test-property-id",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "PUT /admin/properties/{propertyId}",
      stage: "test",
      time: "22/Feb/2026:10:01:00 +0000",
      timeEpoch: 1677046860000,
    },
    isBase64Encoded: false,
  };

  const mockExistingProperty = {
    id: "test-property-id",
    owner_manager_sub: "test-manager-sub",
    name: "Original Property",
    address_line1: "123 Original St",
    address_line2: undefined,
    suburb: "Testville",
    state: "TS",
    postcode: "12345",
    country: "AU",
    timezone: undefined,
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    updated_at: new Date("2024-01-01T00:00:00.000Z"),
    archived_at: undefined,
  };

  const mockUpdatedProperty = {
    ...mockExistingProperty,
    name: "Updated Property Name",
    address_line1: "456 Updated St",
    updated_at: new Date("2024-01-02T00:00:00.000Z"),
  };

  // JSON-serialized version for API response comparison (frontend format with camelCase)
  const mockUpdatedPropertyJson = {
    id: mockUpdatedProperty.id,
    ownerManagerSub: mockUpdatedProperty.owner_manager_sub,
    name: mockUpdatedProperty.name,
    addressLine1: mockUpdatedProperty.address_line1,
    addressLine2: mockUpdatedProperty.address_line2,
    suburb: mockUpdatedProperty.suburb,
    state: mockUpdatedProperty.state,
    postcode: mockUpdatedProperty.postcode,
    country: mockUpdatedProperty.country,
    timezone: mockUpdatedProperty.timezone,
    createdAt: mockUpdatedProperty.created_at.toISOString(),
    updatedAt: mockUpdatedProperty.updated_at.toISOString(),
    archivedAt: mockUpdatedProperty.archived_at,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthorizationHeader.mockReturnValue("Bearer valid-token");
    mockRequireAdminSession.mockResolvedValue({
      sub: "admin-sub",
      sessionId: "session-id",
      persona: "admin",
    });
  });

  it("should update a property successfully", async () => {
    mockGetPropertyById.mockResolvedValue(mockExistingProperty as Property);
    mockUpdateProperty.mockResolvedValue(mockUpdatedProperty as Property);

    const result = await handler(mockEvent);

    expect(mockGetAuthorizationHeader).toHaveBeenCalledWith(mockEvent);
    expect(mockRequireAdminSession).toHaveBeenCalledWith("Bearer valid-token");
    expect(mockGetPropertyById).toHaveBeenCalledWith("test-property-id");
    expect(mockUpdateProperty).toHaveBeenCalledWith(
      "test-property-id",
      "test-manager-sub",
      {
        name: "Updated Property Name",
        address_line1: "456 Updated St",
      },
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(mockUpdatedPropertyJson);
  });

  it("should return 400 when property ID is missing", async () => {
    const eventWithoutPropertyId: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      pathParameters: {},
    };

    const result = await handler(
      eventWithoutPropertyId as APIGatewayProxyEventV2,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Property ID is required",
    });
  });

  it("should return 400 when request body is missing", async () => {
    const eventWithoutBody: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: undefined,
    };

    const result = await handler(eventWithoutBody as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Missing request body",
    });
  });

  it("should return 400 when request body is invalid JSON", async () => {
    const eventWithInvalidJson: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: "invalid-json",
    };

    const result = await handler(
      eventWithInvalidJson as APIGatewayProxyEventV2,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Invalid JSON body",
    });
  });

  it("should return 404 when property is not found", async () => {
    mockGetPropertyById.mockResolvedValue(null);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Not Found",
      message: "Property not found",
    });
  });

  it("should return 401 when authentication fails", async () => {
    mockRequireAdminSession.mockRejectedValue(
      new AuthenticationError("Invalid token"),
    );

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Invalid token",
    });
  });

  it("should return 403 when authorization fails", async () => {
    mockRequireAdminSession.mockRejectedValue(
      new AuthorizationError("Forbidden"),
    );

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Forbidden",
      message: "Admin access required",
    });
  });

  it("should return 404 when updateProperty fails (not found/not owned/archived)", async () => {
    mockGetPropertyById.mockResolvedValue(mockExistingProperty as Property);
    mockUpdateProperty.mockRejectedValue(
      new Error(
        "Property not found, not owned by specified manager, or already archived",
      ),
    );

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Not Found",
      message:
        "Property not found, not owned by specified manager, or already archived",
    });
  });

  it("should return 500 when updateProperty fails with unexpected error", async () => {
    mockGetPropertyById.mockResolvedValue(mockExistingProperty as Property);
    mockUpdateProperty.mockRejectedValue(new Error("Database error"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Internal Server Error",
      message: "Unable to update property",
    });
  });

  it("should handle validation errors from request body", async () => {
    const eventWithInvalidData: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: JSON.stringify({
        name: "", // Empty name should fail validation
        address_line1: "123 Test St",
        suburb: "Testville",
        state: "TS",
        postcode: "12345",
        country: "AU",
      }),
    };

    const result = await handler(
      eventWithInvalidData as APIGatewayProxyEventV2,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Property name cannot be empty",
    });
  });

  it("should handle updating optional fields", async () => {
    const eventWithOptions: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: JSON.stringify({
        address_line2: "Apt 8",
        timezone: "Australia/Melbourne",
      }),
    };
    mockGetPropertyById.mockResolvedValue(mockExistingProperty as Property);

    const updatedPropertyWithOptions = {
      ...mockExistingProperty,
      address_line2: "Apt 8",
      timezone: "Australia/Melbourne",
    } as Property;

    mockUpdateProperty.mockResolvedValue(updatedPropertyWithOptions);

    const result = await handler(eventWithOptions as APIGatewayProxyEventV2);

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      "test-property-id",
      "test-manager-sub",
      {
        address_line2: "Apt 8",
        timezone: "Australia/Melbourne",
      },
    );
    expect(result.statusCode).toBe(200);
  });

  it("should handle empty update payload", async () => {
    const eventWithEmptyPayload: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: JSON.stringify({}),
    };

    const result = await handler(
      eventWithEmptyPayload as APIGatewayProxyEventV2,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "At least one field must be provided for update",
    });
  });
});
