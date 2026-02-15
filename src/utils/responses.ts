import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const ok = <T>(body: T): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const badRequest = (message: string): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 400,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Bad Request', message }),
});

export const unauthorized = (message: string = 'Unauthorized'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 401,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Unauthorized', message }),
});

export const internalError = (message: string = 'Internal Server Error'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 500,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Internal Server Error', message }),
});
