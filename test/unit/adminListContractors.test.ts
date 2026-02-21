import { handler } from '../../src/handlers/adminListContractors';
import { requireAdminSession } from '../../src/utils/sessionAuth';
import { listContractors } from '../../src/services/cognitoContractors';
import { AuthenticationError, AuthorizationError } from '../../src/utils/errors';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/utils/sessionAuth');
jest.mock('../../src/services/cognitoContractors');

describe('adminListContractors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns list of contractors for admin session', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const mockResult = {
      contractors: [
        {
          cognitoSub: 'contractor1',
          username: 'contractor1',
          email: 'contractor1@example.com',
          displayName: 'John Contractor',
          givenName: 'John',
          familyName: 'Contractor',
          phoneNumber: '+61400111222',
          status: 'FORCE_CHANGE_PASSWORD',
          enabled: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModifiedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
      paginationToken: undefined,
      hasMore: false,
    };
    (listContractors as jest.Mock).mockResolvedValue(mockResult);

    const event = {
      headers: { authorization: 'Bearer valid-token' },
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body).toEqual(mockResult);
    expect(requireAdminSession).toHaveBeenCalledWith('Bearer valid-token');
    expect(listContractors).toHaveBeenCalledWith('', { limit: undefined, paginationToken: undefined });
  });

  it('returns 400 for missing authorization header', async () => {
    (requireAdminSession as jest.Mock).mockRejectedValue(new AuthenticationError('Missing Authorization header'));

    const event = { headers: {} } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Missing or invalid Authorization header');
  });

  it('returns 403 for non-admin session', async () => {
    (requireAdminSession as jest.Mock).mockRejectedValue(new AuthorizationError('Forbidden'));

    const event = {
      headers: { authorization: 'Bearer non-admin-token' },
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe('Admin access required');
  });

  it('returns 500 on unexpected error', async () => {
    (requireAdminSession as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

    const event = {
      headers: { authorization: 'Bearer token' },
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Unable to list contractors');
  });
});
