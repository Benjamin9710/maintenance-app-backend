import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { query } from '../db/postgres/client';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  const startedAt = Date.now();

  try {
    await query('SELECT 1');
    const durationMs = Date.now() - startedAt;

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        status: 'ok',
        latencyMs: durationMs,
      }),
    };
  } catch (error) {
    console.error('Database connectivity check failed:', error);

    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Database connectivity check failed',
      }),
    };
  }
};
