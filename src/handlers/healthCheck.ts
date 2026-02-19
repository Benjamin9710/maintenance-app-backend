import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ok } from '../utils/responses';

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  return ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
