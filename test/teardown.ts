export default async function globalTeardown() {
  try {
    // Clean up rate limiter intervals to prevent hanging
    const { cleanupRateLimiters } = await import("../src/utils/rateLimiter");
    cleanupRateLimiters();

    // Close the database pool to prevent hanging connections
    const { closePool } = await import("../src/db/postgres/client");
    await closePool();
  } catch {
    // Silently ignore all errors to prevent hanging
  }
}
