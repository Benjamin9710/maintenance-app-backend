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

interface RateLimitOptions {
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * In-memory rate limiter for API endpoints
 * In production, this should be replaced with a distributed cache like Redis
 */
export class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every 5 minutes
    // Only set up interval if not in test environment with fake timers
    if (typeof jest === "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Clean up the rate limiter interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
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
   * Atomically decrement count for failed request handling
   */
  decrementCount(key: string): boolean {
    try {
      const entry = this.store.get(key);
      if (!entry || entry.count <= 0) {
        return false; // Cannot decrement or entry doesn't exist
      }

      entry.count--;
      return true;
    } catch (error) {
      console.error("Error decrementing rate limit count:", error);
      return false;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    try {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    } catch (error) {
      console.error("Error during rate limiter cleanup:", error);
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
 * Initialize rate limiters (call during application startup)
 */
export const initializeRateLimiters = (): void => {
  // Rate limiters are already initialized on module import
  // This function exists for explicit initialization if needed
  console.log("Rate limiters initialized");
};

/**
 * Clean up rate limiter intervals (for test teardown and graceful shutdown)
 */
export const cleanupRateLimiters = (): void => {
  adminRateLimiter.destroy();
  generalRateLimiter.destroy();
  console.log("Rate limiters cleaned up");
};

/**
 * Graceful shutdown handler for production environments
 */
export const setupGracefulShutdown = (): void => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Setup graceful shutdown handlers
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}, cleaning up rate limiters...`);
      cleanupRateLimiters();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
};

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
    // For now, use a simple hash of the auth header to avoid exposing raw tokens
    // Using a simple hash function for consistency
    let hash = 0;
    for (let i = 0; i < authHeader.length; i++) {
      const char = authHeader.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `auth:${Math.abs(hash).toString(16)}`;
  }

  // Ultimate fallback - use timestamp to prevent collisions
  return `unknown:${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Rate limiting middleware
 */
export const withRateLimit = (
  rateLimiter: MemoryRateLimiter,
  options: RateLimitOptions = {},
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

        // For successful requests, we might want to not count them against the rate limit
        if (options.skipSuccessfulRequests) {
          rateLimiter.decrementCount(clientKey);
        }

        return response;
      } catch (error) {
        // For failed requests, we might want to not count them against the rate limit
        if (options.skipFailedRequests) {
          rateLimiter.decrementCount(clientKey);
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
