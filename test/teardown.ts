export default async function globalTeardown() {
  try {
    // Close the database pool to prevent hanging connections
    const { closePool } = await import("../src/db/postgres/client");
    await closePool();
  } catch (error) {
    // Ignore errors during teardown (e.g., certificate import issues)
    console.warn("Warning: Error during global teardown:", error);
  }
}
