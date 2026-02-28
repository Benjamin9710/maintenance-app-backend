import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { tooManyRequests } from "./responses";

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * In-memory rate limiter for API endpoints
 * In production, this should be replaced with a distributed cache like Redis
 */
class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Checks if a request should be rate limited
   */
  isAllowed(key: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
        firstRequest: now,
      };
      this.store.set(key, newEntry);
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Existing window
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(
    key: string,
  ): { count: number; remaining: number; resetTime: number } | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

// Rate limiter instances for different endpoint types
export const adminRateLimiter = new MemoryRateLimiter(60000, 50); // 50 requests per minute for admin endpoints
export const generalRateLimiter = new MemoryRateLimiter(60000, 100); // 100 requests per minute for general endpoints

/**
 * Extracts client identifier from request
 */
export const getClientKey = (event: APIGatewayProxyEventV2): string => {
  // Try to get client IP from source IP
  const sourceIp = event.requestContext?.http?.sourceIp;

  if (sourceIp) {
    return `ip:${sourceIp}`;
  }

  // Fallback to user sub if available
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
    // In a real implementation, you'd decode the JWT to get the sub
    // For now, use a hash of the auth header
    return `auth:${Buffer.from(authHeader).toString("base64").slice(0, 16)}`;
  }

  // Ultimate fallback
  return `unknown:${Date.now()}`;
};

/**
 * Rate limiting middleware
 */
export const withRateLimit = (
  rateLimiter: MemoryRateLimiter,
  options: {
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  } = {},
) => {
  return (
    handler: (
      event: APIGatewayProxyEventV2,
    ) => Promise<APIGatewayProxyStructuredResultV2>,
  ) => {
    return async (
      event: APIGatewayProxyEventV2,
    ): Promise<APIGatewayProxyStructuredResultV2> => {
      const clientKey = getClientKey(event);
      const result = rateLimiter.isAllowed(clientKey);

      // Add rate limit headers
      const headers: Record<string, string> = {
        "X-RateLimit-Limit": rateLimiter["maxRequests"].toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
      };

      if (!result.allowed) {
        return tooManyRequests("Rate limit exceeded", {
          "Retry-After": Math.ceil(
            (result.resetTime - Date.now()) / 1000,
          ).toString(),
          ...headers,
        });
      }

      try {
        const response = await handler(event);

        // Add rate limit headers to successful response
        if (response.headers) {
          Object.assign(response.headers, headers);
        } else {
          response.headers = headers;
        }

        return response;
      } catch (error) {
        // For failed requests, we might want to not count them against the rate limit
        if (options.skipFailedRequests) {
          const entry = rateLimiter["store"].get(clientKey);
          if (entry) {
            entry.count--;
          }
        }
        throw error;
      }
    };
  };
};

/**
 * Rate limiting middleware specifically for admin endpoints
 */
export const withAdminRateLimit = (
  handler: (
    event: APIGatewayProxyEventV2,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
) => {
  return withRateLimit(adminRateLimiter)(handler);
};

/**
 * Rate limiting middleware for general endpoints
 */
export const withGeneralRateLimit = (
  handler: (
    event: APIGatewayProxyEventV2,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
) => {
  return withRateLimit(generalRateLimiter)(handler);
};
