import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

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

export const forbidden = (message: string = 'Forbidden'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 403,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Forbidden', message }),
});

export const notFound = (message: string = 'Not Found'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 404,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Not Found', message }),
});

export const conflict = (message: string = 'Conflict'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 409,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Conflict', message }),
});

export const tooManyRequests = (message: string = 'Too Many Requests', additionalHeaders?: Record<string, string>): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 429,
  headers: { 
    'content-type': 'application/json',
    ...additionalHeaders,
  },
  body: JSON.stringify({ error: 'Too Many Requests', message }),
});

export const internalError = (message: string = 'Internal Server Error'): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 500,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ error: 'Internal Server Error', message }),
});
