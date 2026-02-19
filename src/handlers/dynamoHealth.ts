import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok, internalError } from '../utils/responses';
import { pingDynamo } from '../db/dynamodb/client';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  const startedAt = Date.now();

  try {
    await pingDynamo();
    const durationMs = Date.now() - startedAt;

    return ok({
      status: 'ok',
      latencyMs: durationMs,
    });
  } catch (error) {
    console.error('DynamoDB connectivity check failed:', error);

    return internalError('DynamoDB connectivity check failed');
  }
};
