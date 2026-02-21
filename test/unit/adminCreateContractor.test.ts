import { handler } from '../../src/handlers/adminCreateContractor';
import { requireAdminSession } from '../../src/utils/sessionAuth';
import { createContractor } from '../../src/services/cognitoContractors';
import { validateCreateContractorRequest } from '../../src/utils/validation';
import { AuthenticationError, AuthorizationError, ValidationError } from '../../src/utils/errors';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/utils/sessionAuth');
jest.mock('../../src/services/cognitoContractors');
jest.mock('../../src/utils/validation');

describe('adminCreateContractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a contractor for admin session with valid payload', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    const mockContractor = {
      cognitoSub: 'new-contractor-sub',
      username: 'contractor@example.com',
      email: 'contractor@example.com',
      displayName: 'Jane Contractor',
      givenName: 'Jane',
      familyName: 'Contractor',
      phoneNumber: '+61400111223',
      status: 'FORCE_CHANGE_PASSWORD',
      enabled: true,
      createdAt: '2023-01-01T00:00:00.000Z',
      lastModifiedAt: '2023-01-01T00:00:00.000Z',
    };
    (createContractor as jest.Mock).mockResolvedValue(mockContractor);

    const payload = {
      email: 'contractor@example.com',
      displayName: 'Jane Contractor',
      givenName: 'Jane',
      familyName: 'Contractor',
      phoneNumber: '+61400111223',
    };

    (validateCreateContractorRequest as jest.Mock).mockReturnValue(payload);

    const event = {
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify(payload),
    } as unknown as APIGatewayProxyEventV2;

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body!);
    expect(body).toEqual(mockContractor);
    expect(requireAdminSession).toHaveBeenCalledWith('Bearer valid-token');
    expect(validateCreateContractorRequest).toHaveBeenCalledWith(payload);
    expect(createContractor).toHaveBeenCalledWith('', payload);
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
      email: 'contractor@example.com',
      // Missing other required fields
    };

    (validateCreateContractorRequest as jest.Mock).mockImplementation(() => {
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
      displayName: 'Jane Contractor',
      givenName: 'Jane',
      familyName: 'Contractor',
      phoneNumber: '+61400111223',
    };

    (validateCreateContractorRequest as jest.Mock).mockImplementation(() => {
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

  it('returns 400 when contractor already exists', async () => {
    const mockSession = {
      sub: 'admin123',
      sessionId: 'session-123',
      email: 'admin@example.com',
      persona: 'admin' as const,
    };
    (requireAdminSession as jest.Mock).mockResolvedValue(mockSession);

    // Reset validation mock to pass validation
    (validateCreateContractorRequest as jest.Mock).mockReturnValue({
      email: 'existing@example.com',
      displayName: 'Existing Contractor',
      givenName: 'Existing',
      familyName: 'Contractor',
      phoneNumber: '+61400111224',
    });

    (createContractor as jest.Mock).mockRejectedValue(new Error('UsernameExistsException'));

    const payload = {
      email: 'existing@example.com',
      displayName: 'Existing Contractor',
      givenName: 'Existing',
      familyName: 'Contractor',
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
    expect(body.message).toBe('A contractor with this email already exists');
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
    expect(body.message).toBe('Unable to create contractor');
  });
});
