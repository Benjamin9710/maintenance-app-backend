import { handler } from "../../src/handlers/adminArchiveProperty";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  archiveProperty,
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

const mockArchiveProperty = archiveProperty as jest.MockedFunction<
  typeof archiveProperty
>;
const mockGetPropertyById = getPropertyById as jest.MockedFunction<
  typeof getPropertyById
>;
const mockRequireAdminSession = requireAdminSession as jest.MockedFunction<
  typeof requireAdminSession
>;
const mockGetAuthorizationHeader =
  getAuthorizationHeader as jest.MockedFunction<typeof getAuthorizationHeader>;

describe("adminArchiveProperty", () => {
  const mockEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "POST /admin/properties/{propertyId}/archive",
    rawPath: "/admin/properties/test-property-id/archive",
    rawQueryString: "",
    headers: { Authorization: "Bearer valid-token" },
    pathParameters: { propertyId: "test-property-id" },
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.execute-api.ap-southeast-2.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "POST",
        path: "/admin/properties/test-property-id/archive",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "POST /admin/properties/{propertyId}/archive",
      stage: "test",
      time: "22/Feb/2026:09:48:00 +0000",
      timeEpoch: 1677046080000,
    },
    isBase64Encoded: false,
  };

  const mockActiveProperty = {
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

  const mockArchivedProperty = {
    ...mockActiveProperty,
    archived_at: new Date("2024-01-15T10:30:00.000Z"),
    updated_at: new Date("2024-01-15T10:30:00.000Z"),
  };

  // JSON-serialized version for API response comparison
  const mockArchivedPropertyJson = {
    ...mockArchivedProperty,
    created_at: mockArchivedProperty.created_at.toISOString(),
    updated_at: mockArchivedProperty.updated_at.toISOString(),
    archived_at: mockArchivedProperty.archived_at.toISOString(),
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

  it("should archive a property successfully", async () => {
    mockGetPropertyById.mockResolvedValue(mockActiveProperty as Property);
    mockArchiveProperty.mockResolvedValue(mockArchivedProperty as Property);

    const result = await handler(mockEvent);

    expect(mockGetAuthorizationHeader).toHaveBeenCalledWith(mockEvent);
    expect(mockRequireAdminSession).toHaveBeenCalledWith("Bearer valid-token");
    expect(mockGetPropertyById).toHaveBeenCalledWith("test-property-id");
    expect(mockArchiveProperty).toHaveBeenCalledWith(
      "test-property-id",
      "test-manager-sub",
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(mockArchivedPropertyJson);
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

  it("should return 404 when archiveProperty fails (not found/not owned/archived)", async () => {
    mockGetPropertyById.mockResolvedValue(mockActiveProperty as Property);
    mockArchiveProperty.mockRejectedValue(
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

  it("should return 500 when archiveProperty fails with unexpected error", async () => {
    mockGetPropertyById.mockResolvedValue(mockActiveProperty as Property);
    mockArchiveProperty.mockRejectedValue(new Error("Database error"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Internal Server Error",
      message: "Unable to archive property",
    });
  });

  it("should return 404 when trying to archive already archived property", async () => {
    const alreadyArchivedProperty = {
      ...mockActiveProperty,
      archived_at: new Date("2024-01-10T00:00:00.000Z"),
    };
    mockGetPropertyById.mockResolvedValue(alreadyArchivedProperty as Property);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Not Found",
      message: "Property not found",
    });
  });

  it("should handle archiveProperty returning archived property with timestamp", async () => {
    const archivedWithTimestamp = {
      ...mockActiveProperty,
      archived_at: new Date("2024-01-15T14:25:30.123Z"),
      updated_at: new Date("2024-01-15T14:25:30.123Z"),
    };

    // JSON-serialized version for API response comparison
    const archivedWithTimestampJson = {
      ...archivedWithTimestamp,
      created_at: archivedWithTimestamp.created_at.toISOString(),
      updated_at: archivedWithTimestamp.updated_at.toISOString(),
      archived_at: archivedWithTimestamp.archived_at.toISOString(),
    };

    mockGetPropertyById.mockResolvedValue(mockActiveProperty as Property);
    mockArchiveProperty.mockResolvedValue(archivedWithTimestamp as Property);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(
      archivedWithTimestampJson,
    );
    expect(JSON.parse(result.body as string).archived_at).toBe(
      "2024-01-15T14:25:30.123Z",
    );
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
    const archivedWithoutOptionals = {
      ...propertyWithoutOptionals,
      archived_at: new Date("2024-01-15T10:30:00.000Z"),
      updated_at: new Date("2024-01-15T10:30:00.000Z"),
    };
    // JSON-serialized version for API response comparison
    const archivedWithoutOptionalsJson = {
      ...archivedWithoutOptionals,
      created_at: archivedWithoutOptionals.created_at.toISOString(),
      updated_at: archivedWithoutOptionals.updated_at.toISOString(),
      archived_at: archivedWithoutOptionals.archived_at.toISOString(),
    };

    mockGetPropertyById.mockResolvedValue(propertyWithoutOptionals as Property);
    mockArchiveProperty.mockResolvedValue(archivedWithoutOptionals as Property);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(
      archivedWithoutOptionalsJson,
    );
  });
});
