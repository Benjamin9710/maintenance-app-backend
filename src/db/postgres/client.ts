import { Pool, type QueryResultRow } from "pg";
import { dbConfig } from "../../config/env";
import caBundle from "../../certs/ap-southeast-2-bundle.pem";

let pool: Pool | undefined;

const getSslConfig = () => {
  if (!dbConfig.ssl) {
    return undefined;
  }

  const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  if (rejectUnauthorizedEnv === "false") {
    return { rejectUnauthorized: false };
  }

  return { ca: caBundle };
};

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: getSslConfig(),
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
};

// Add cleanup function for test teardown
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  queryText: string,
  params?: unknown[],
): Promise<T[]> => {
  const client = await getPool().connect();

  try {
    // Set search path to include base schema
    await client.query("SET search_path TO base,public");
    const result = await client.query<T>(queryText, params);
    return result.rows;
  } finally {
    client.release();
  }
};
