import {
  MemoryRateLimiter,
  getClientKey,
  cleanupRateLimiters,
} from "../../src/utils/rateLimiter";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

describe("Rate Limiter", () => {
  let rateLimiter: MemoryRateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    rateLimiter = new MemoryRateLimiter(60000, 5); // 5 requests per minute for testing
  });

  afterEach(() => {
    rateLimiter.destroy();
    jest.useRealTimers();
    cleanupRateLimiters();
  });

  describe("MemoryRateLimiter", () => {
    it("should allow requests within limit", () => {
      const result1 = rateLimiter.isAllowed("test-key");
      const result2 = rateLimiter.isAllowed("test-key");

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it("should block requests when limit exceeded", () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed("test-key");
      }

      // Next request should be blocked
      const result = rateLimiter.isAllowed("test-key");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset after window expires", () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed("test-key");
      }

      // Should be blocked
      let result = rateLimiter.isAllowed("test-key");
      expect(result.allowed).toBe(false);

      // Mock time passage by directly manipulating internal state
      const pastTime = Date.now() - 70000; // 70 seconds ago
      const store = (rateLimiter as unknown as { store: Map<string, unknown> })
        .store;
      store.set("test-key", {
        count: 5,
        resetTime: pastTime + 60000,
        firstRequest: pastTime,
      });

      // Should be allowed again
      result = rateLimiter.isAllowed("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should handle different keys independently", () => {
      const result1 = rateLimiter.isAllowed("key1");
      const result2 = rateLimiter.isAllowed("key2");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(4);
    });

    it("should decrement count successfully", () => {
      // Add some requests
      rateLimiter.isAllowed("test-key");
      rateLimiter.isAllowed("test-key");

      // Decrement should work
      const success = rateLimiter.decrementCount("test-key");
      expect(success).toBe(true);

      // Should have one more remaining
      const result = rateLimiter.isAllowed("test-key");
      expect(result.remaining).toBe(3); // Was 2, decremented to 1, then incremented to 2
    });

    it("should return status for existing key", () => {
      rateLimiter.isAllowed("test-key");
      rateLimiter.isAllowed("test-key");

      const status = rateLimiter.getStatus("test-key");
      expect(status).not.toBeNull();
      expect(status!.count).toBe(2);
      expect(status!.remaining).toBe(3);
    });

    it("should return null for non-existent key", () => {
      const status = rateLimiter.getStatus("non-existent");
      expect(status).toBeNull();
    });
  });

  describe("getClientKey", () => {
    it("should extract IP from source IP", () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          accountId: "123456789012",
          apiId: "test-api",
          domainName: "test.execute-api.amazonaws.com",
          domainPrefix: "test",
          http: {
            method: "GET",
            path: "/test",
            protocol: "HTTPS",
            sourceIp: "192.168.1.1",
            userAgent: "test-agent",
          },
          requestId: "test-request",
          routeKey: "GET /test",
          stage: "test",
          time: "02/Mar/2026:07:00:00 +0000",
          timeEpoch: 1709385600,
        },
        headers: {},
      };

      const key = getClientKey(event as APIGatewayProxyEventV2);
      expect(key).toBe("ip:192.168.1.1");
    });

    it("should hash auth header when IP not available", () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          accountId: "123456789012",
          apiId: "test-api",
          domainName: "test.execute-api.amazonaws.com",
          domainPrefix: "test",
          http: {
            method: "GET",
            path: "/test",
            protocol: "HTTPS",
            sourceIp: "", // Empty IP to force fallback to auth header
            userAgent: "test-agent",
          },
          requestId: "test-request",
          routeKey: "GET /test",
          stage: "test",
          time: "02/Mar/2026:07:00:00 +0000",
          timeEpoch: 1709385600,
        },
        headers: {
          authorization: "Bearer test-token-123",
        },
      };

      const key = getClientKey(event as APIGatewayProxyEventV2);
      expect(key).toMatch(/^auth:[a-f0-9]+$/);
      expect(key).not.toContain("test-token-123"); // Should not expose raw token
    });

    it("should use fallback when neither IP nor auth available", () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          accountId: "123456789012",
          apiId: "test-api",
          domainName: "test.execute-api.amazonaws.com",
          domainPrefix: "test",
          http: {
            method: "GET",
            path: "/test",
            protocol: "HTTPS",
            sourceIp: "192.168.1.1",
            userAgent: "test-agent",
          },
          requestId: "test-request",
          routeKey: "GET /test",
          stage: "test",
          time: "02/Mar/2026:07:00:00 +0000",
          timeEpoch: 1709385600,
        },
        headers: {},
      };

      // Override the source IP to test fallback
      if (event.requestContext?.http) {
        (event.requestContext.http as { sourceIp?: string }).sourceIp =
          undefined;
      }

      const key = getClientKey(event as APIGatewayProxyEventV2);
      expect(key).toMatch(/^unknown:\d+-[a-z0-9]+$/);
    });
  });
});
