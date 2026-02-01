import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { pingDynamo } from '../db/dynamodb/client';

export const handler = async (): Promise<APIGatewayProxyStructuredResultV2> => {
  const startedAt = Date.now();

  try {
    await pingDynamo();
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
    console.error('DynamoDB connectivity check failed:', error);

    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        status: 'error',
        message: 'DynamoDB connectivity check failed',
      }),
    };
  }
};
