import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, internalError } from '../utils/responses';
import { query } from '../db/postgres/client';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  const startedAt = Date.now();

  try {
    await query('SELECT 1');
    const durationMs = Date.now() - startedAt;

    return ok({
      status: 'ok',
      latencyMs: durationMs,
    });
  } catch (error) {
    console.error('Database connectivity check failed:', error);

    return internalError('Database connectivity check failed');
  }
};
