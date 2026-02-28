import { handler } from "../../src/handlers/adminGetProperty";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { getPropertyById } from "../../src/db/postgres/propertiesRepository";
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

const mockGetPropertyById = getPropertyById as jest.MockedFunction<
  typeof getPropertyById
>;
const mockRequireAdminSession = requireAdminSession as jest.MockedFunction<
  typeof requireAdminSession
>;
const mockGetAuthorizationHeader =
  getAuthorizationHeader as jest.MockedFunction<typeof getAuthorizationHeader>;

describe("adminGetProperty", () => {
  const mockEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "GET /admin/properties/{propertyId}",
    rawPath: "/admin/properties/test-property-id",
    rawQueryString: "",
    headers: { Authorization: "Bearer valid-token" },
    pathParameters: { propertyId: "test-property-id" },
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.execute-api.ap-southeast-2.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "GET",
        path: "/admin/properties/test-property-id",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "GET /admin/properties/{propertyId}",
      stage: "test",
      time: "22/Feb/2026:09:57:00 +0000",
      timeEpoch: 1677046620000,
    },
    isBase64Encoded: false,
  };

  const mockProperty = {
    id: "test-property-id",
    owner_manager_sub: "test-manager-sub",
    name: "Test Property",
    address_line1: "123 Test St",
    address_line2: "Apt 4",
    suburb: "Testville",
    state: "TS",
    postcode: "12345",
    country: "AU",
    timezone: "Australia/Sydney",
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    updated_at: new Date("2024-01-01T00:00:00.000Z"),
    archived_at: undefined,
  };

  // JSON-serialized version for API response comparison (transformed to camelCase)
  const mockPropertyJson = {
    id: "test-property-id",
    ownerManagerSub: "test-manager-sub",
    name: "Test Property",
    addressLine1: "123 Test St",
    addressLine2: "Apt 4",
    suburb: "Testville",
    state: "TS",
    postcode: "12345",
    country: "AU",
    timezone: "Australia/Sydney",
    createdAt: mockProperty.created_at.toISOString(),
    updatedAt: mockProperty.updated_at.toISOString(),
    archivedAt: undefined,
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

  it("should get a property successfully", async () => {
    mockGetPropertyById.mockResolvedValue(mockProperty as Property);

    const result = await handler(mockEvent);

    expect(mockGetAuthorizationHeader).toHaveBeenCalledWith(mockEvent);
    expect(mockRequireAdminSession).toHaveBeenCalledWith("Bearer valid-token");
    expect(mockGetPropertyById).toHaveBeenCalledWith("test-property-id");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(mockPropertyJson);
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

  it("should return 500 when getPropertyById fails", async () => {
    mockGetPropertyById.mockRejectedValue(new Error("Database error"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Internal Server Error",
      message: "Unable to get property",
    });
  });

  it("should handle archived property correctly", async () => {
    const archivedProperty = {
      ...mockProperty,
      archived_at: new Date("2024-01-15T00:00:00.000Z"),
    };

    // JSON-serialized version for API response comparison (transformed to camelCase)
    const archivedPropertyJson = {
      id: "test-property-id",
      ownerManagerSub: "test-manager-sub",
      name: "Test Property",
      addressLine1: "123 Test St",
      addressLine2: "Apt 4",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
      timezone: "Australia/Sydney",
      createdAt: archivedProperty.created_at.toISOString(),
      updatedAt: archivedProperty.updated_at.toISOString(),
      archivedAt: archivedProperty.archived_at.toISOString(),
    };

    mockGetPropertyById.mockResolvedValue(archivedProperty as Property);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(archivedPropertyJson);
  });

  it("should handle property without optional fields", async () => {
    const propertyWithoutOptionals = {
      id: "test-property-id",
      owner_manager_sub: "test-manager-sub",
      name: "Test Property",
      address_line1: "123 Test St",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      archived_at: undefined,
    };

    // JSON-serialized version for API response comparison (transformed to camelCase)
    const propertyWithoutOptionalsJson = {
      id: "test-property-id",
      ownerManagerSub: "test-manager-sub",
      name: "Test Property",
      addressLine1: "123 Test St",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
      createdAt: propertyWithoutOptionals.created_at.toISOString(),
      updatedAt: propertyWithoutOptionals.updated_at.toISOString(),
      archivedAt: undefined,
    };

    mockGetPropertyById.mockResolvedValue(propertyWithoutOptionals as Property);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(
      propertyWithoutOptionalsJson,
    );
  });
});
