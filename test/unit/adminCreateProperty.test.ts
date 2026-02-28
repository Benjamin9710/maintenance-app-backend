import { handler } from "../../src/handlers/adminCreateProperty";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createProperty } from "../../src/db/postgres/propertiesRepository";
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

const mockCreateProperty = createProperty as jest.MockedFunction<
  typeof createProperty
>;
const mockRequireAdminSession = requireAdminSession as jest.MockedFunction<
  typeof requireAdminSession
>;
const mockGetAuthorizationHeader =
  getAuthorizationHeader as jest.MockedFunction<typeof getAuthorizationHeader>;

describe("adminCreateProperty", () => {
  const mockEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "POST /admin/managers/{managerSub}/properties",
    rawPath: "/admin/managers/test-manager-sub/properties",
    rawQueryString: "",
    headers: { Authorization: "Bearer valid-token" },
    pathParameters: { managerSub: "test-manager-sub" },
    body: JSON.stringify({
      name: "Test Property",
      address_line1: "123 Test St",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
    }),
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.execute-api.ap-southeast-2.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "POST",
        path: "/admin/managers/test-manager-sub/properties",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "POST /admin/managers/{managerSub}/properties",
      stage: "test",
      time: "22/Feb/2026:09:55:00 +0000",
      timeEpoch: 1677046500000,
    },
    isBase64Encoded: false,
  };

  const mockProperty = {
    id: "test-property-id",
    owner_manager_sub: "test-manager-sub",
    name: "Test Property",
    address_line1: "123 Test St",
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

  // JSON-serialized version for API response comparison (transformed to camelCase)
  const mockPropertyJson = {
    id: "test-property-id",
    ownerManagerSub: "test-manager-sub",
    name: "Test Property",
    addressLine1: "123 Test St",
    addressLine2: undefined,
    suburb: "Testville",
    state: "TS",
    postcode: "12345",
    country: "AU",
    timezone: undefined,
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

  it("should create a property successfully", async () => {
    mockCreateProperty.mockResolvedValue(mockProperty as Property);

    const result = await handler(mockEvent);

    expect(mockGetAuthorizationHeader).toHaveBeenCalledWith(mockEvent);
    expect(mockRequireAdminSession).toHaveBeenCalledWith("Bearer valid-token");
    expect(mockCreateProperty).toHaveBeenCalledWith("test-manager-sub", {
      name: "Test Property",
      address_line1: "123 Test St",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual(mockPropertyJson);
  });

  it("should return 400 when manager sub is missing", async () => {
    const eventWithoutManagerSub: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      pathParameters: {},
    };

    const result = await handler(
      eventWithoutManagerSub as APIGatewayProxyEventV2,
    );

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body as string);
    expect(responseBody).toEqual({
      error: "Bad Request",
      message: "Manager sub is required",
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

  it("should return 400 when validation fails", async () => {
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
      message: "Missing or invalid required field: name",
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

  it("should return 500 when createProperty fails", async () => {
    mockCreateProperty.mockRejectedValue(new Error("Database error"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Internal Server Error",
      message: "Unable to create property",
    });
  });

  it("should handle optional fields correctly", async () => {
    const eventWithOptions: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      body: JSON.stringify({
        name: "Test Property",
        address_line1: "123 Test St",
        address_line2: "Apt 4",
        suburb: "Testville",
        state: "TS",
        postcode: "12345",
        country: "AU",
        timezone: "Australia/Sydney",
      }),
    };

    mockCreateProperty.mockResolvedValue(mockProperty as Property);

    const result = await handler(eventWithOptions as APIGatewayProxyEventV2);

    expect(mockCreateProperty).toHaveBeenCalledWith("test-manager-sub", {
      name: "Test Property",
      address_line1: "123 Test St",
      address_line2: "Apt 4",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
      timezone: "Australia/Sydney",
    });
    expect(result.statusCode).toBe(200);
  });
});
