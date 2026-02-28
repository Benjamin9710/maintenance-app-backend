import { handler } from "../../src/handlers/adminListManagerProperties";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { listPropertiesByOwner } from "../../src/db/postgres/propertiesRepository";
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

const mockListPropertiesByOwner = listPropertiesByOwner as jest.MockedFunction<
  typeof listPropertiesByOwner
>;
const mockRequireAdminSession = requireAdminSession as jest.MockedFunction<
  typeof requireAdminSession
>;
const mockGetAuthorizationHeader =
  getAuthorizationHeader as jest.MockedFunction<typeof getAuthorizationHeader>;

describe("adminListManagerProperties", () => {
  const mockEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "GET /admin/managers/{managerSub}/properties",
    rawPath: "/admin/managers/test-manager-sub/properties",
    rawQueryString: "includeArchived=false",
    headers: { Authorization: "Bearer valid-token" },
    pathParameters: { managerSub: "test-manager-sub" },
    queryStringParameters: { includeArchived: "false" },
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.execute-api.ap-southeast-2.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: "GET",
        path: "/admin/managers/test-manager-sub/properties",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: "test-request-id",
      routeKey: "GET /admin/managers/{managerSub}/properties",
      stage: "test",
      time: "22/Feb/2026:09:58:00 +0000",
      timeEpoch: 1677046680000,
    },
    isBase64Encoded: false,
  };

  const mockProperties = [
    {
      id: "property-1",
      owner_manager_sub: "test-manager-sub",
      name: "Property 1",
      address_line1: "123 Test St",
      suburb: "Testville",
      state: "TS",
      postcode: "12345",
      country: "AU",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      archived_at: undefined,
    },
    {
      id: "property-2",
      owner_manager_sub: "test-manager-sub",
      name: "Property 2",
      address_line1: "456 Test Ave",
      suburb: "Testtown",
      state: "TT",
      postcode: "67890",
      country: "AU",
      created_at: new Date("2024-01-02T00:00:00.000Z"),
      updated_at: new Date("2024-01-02T00:00:00.000Z"),
      archived_at: undefined,
    },
  ];

  // JSON-serialized version for API response comparison
  const mockPropertiesJson = mockProperties.map((property) => ({
    ...property,
    created_at: property.created_at.toISOString(),
    updated_at: property.updated_at.toISOString(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthorizationHeader.mockReturnValue("Bearer valid-token");
    mockRequireAdminSession.mockResolvedValue({
      sub: "admin-sub",
      sessionId: "session-id",
      persona: "admin",
    });
  });

  it("should list properties successfully without archived", async () => {
    mockListPropertiesByOwner.mockResolvedValue(mockProperties as Property[]);

    const result = await handler(mockEvent);

    expect(mockGetAuthorizationHeader).toHaveBeenCalledWith(mockEvent);
    expect(mockRequireAdminSession).toHaveBeenCalledWith("Bearer valid-token");
    expect(mockListPropertiesByOwner).toHaveBeenCalledWith("test-manager-sub", {
      includeArchived: false,
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({
      properties: mockPropertiesJson,
    });
  });

  it("should list properties successfully with archived", async () => {
    const eventWithArchived: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      queryStringParameters: { includeArchived: "true" },
    };
    mockListPropertiesByOwner.mockResolvedValue(mockProperties as Property[]);

    const result = await handler(eventWithArchived as APIGatewayProxyEventV2);

    expect(mockListPropertiesByOwner).toHaveBeenCalledWith("test-manager-sub", {
      includeArchived: true,
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({
      properties: mockPropertiesJson,
    });
  });

  it("should default to includeArchived=false when parameter is missing", async () => {
    const eventWithoutParam: Partial<APIGatewayProxyEventV2> = {
      ...mockEvent,
      queryStringParameters: undefined,
    };
    mockListPropertiesByOwner.mockResolvedValue(mockProperties as Property[]);

    const result = await handler(eventWithoutParam as APIGatewayProxyEventV2);

    expect(mockListPropertiesByOwner).toHaveBeenCalledWith("test-manager-sub", {
      includeArchived: false,
    });
    expect(result.statusCode).toBe(200);
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
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Bad Request",
      message: "Manager sub is required",
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

  it("should return 500 when listPropertiesByOwner fails", async () => {
    mockListPropertiesByOwner.mockRejectedValue(new Error("Database error"));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: "Internal Server Error",
      message: "Unable to list properties",
    });
  });

  it("should handle empty property list", async () => {
    mockListPropertiesByOwner.mockResolvedValue([]);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body as string)).toEqual({
      properties: [],
    });
  });
});
