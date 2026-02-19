import { handler } from '../../src/handlers/adminCreateManager';
import { requireAdminSession } from '../../src/utils/sessionAuth';
import { createManager } from '../../src/services/cognitoManagers';
import { validateCreateManagerRequest } from '../../src/utils/validation';
import { AuthenticationError, AuthorizationError, ValidationError } from '../../src/utils/errors';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/utils/sessionAuth');
jest.mock('../../src/services/cognitoManagers');
jest.mock('../../src/utils/validation');

describe('adminCreateManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a manager for admin session with valid payload', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const mockManager = {
      cognitoSub: 'new-manager-sub',
      username: 'manager@example.com',
      email: 'manager@example.com',
      displayName: 'Jane Manager',
      givenName: 'Jane',
      familyName: 'Manager',
      phoneNumber: '+61400111223',
      status: 'FORCE_CHANGE_PASSWORD',
      enabled: true,
      createdAt: '2023-01-01T00:00:00.000Z',
      lastModifiedAt: '2023-01-01T00:00:00.000Z',
    };
    (createManager as jest.Mock).mockResolvedValue(mockManager);

    const payload = {
      email: 'manager@example.com',
      displayName: 'Jane Manager',
      givenName: 'Jane',
      familyName: 'Manager',
      phoneNumber: '+61400111223',
    };

    (validateCreateManagerRequest as jest.Mock).mockReturnValue(payload);

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify(payload),
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body).toEqual(mockManager);
    expect(requireAdminSession).toHaveBeenCalledWith('Bearer valid-token');
    expect(validateCreateManagerRequest).toHaveBeenCalledWith(payload);
    expect(createManager).toHaveBeenCalledWith('', payload);
  });

  it('returns 400 for missing request body', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const event = {
      headers: { authorization: 'Bearer valid-token' },
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Missing request body');
  });

  it('returns 400 for invalid JSON body', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: 'invalid-json',
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Invalid JSON body');
  });

  it('returns 400 for missing required fields', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const payload = {
      email: 'manager@example.com',
      // Missing other required fields
    };

    (validateCreateManagerRequest as jest.Mock).mockImplementation(() => {
      throw new ValidationError('Missing or invalid required field: displayName');
    });

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify(payload),
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Missing or invalid required field: displayName');
  });

  it('returns 400 for invalid email format', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const payload = {
      email: 'invalid-email',
      displayName: 'Jane Manager',
      givenName: 'Jane',
      familyName: 'Manager',
      phoneNumber: '+61400111223',
    };

    (validateCreateManagerRequest as jest.Mock).mockImplementation(() => {
      throw new ValidationError('Invalid email format');
    });

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify(payload),
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Invalid email format');
  });

  it('returns 400 for missing authorization header', async () => {
    (requireAdminSession as jest.Mock).mockRejectedValue(new AuthenticationError('Missing Authorization header'));

    const event = {
      headers: {},
      body: JSON.stringify({
        email: 'test@example.com',
        displayName: 'Test',
        givenName: 'Test',
        familyName: 'User',
        phoneNumber: '+61400111222',
      }),
    } as unknown as APIGatewayProxyEventV2;

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

  it('returns 400 when manager already exists', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    // Reset validation mock to pass validation
    (validateCreateManagerRequest as jest.Mock).mockReturnValue({
      email: 'existing@example.com',
      displayName: 'Existing Manager',
      givenName: 'Existing',
      familyName: 'Manager',
      phoneNumber: '+61400111224',
    });

    (createManager as jest.Mock).mockRejectedValue(new Error('UsernameExistsException'));

    const payload = {
      email: 'existing@example.com',
      displayName: 'Existing Manager',
      givenName: 'Existing',
      familyName: 'Manager',
      phoneNumber: '+61400111224',
    };

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify(payload),
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body!);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('A manager with this email already exists');
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
    expect(body.message).toBe('Unable to create manager');
  });
});
