import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminCreateUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AttributeType, UserType } from '@aws-sdk/client-cognito-identity-provider';
import { dynamoConfig } from '../config/env';

const client = new CognitoIdentityProviderClient({ region: dynamoConfig.region });

export interface ManagerSummary {
  cognitoSub: string;
  username: string;
  email: string | null;
  displayName: string | null;
  givenName: string | null;
  familyName: string | null;
  phoneNumber: string | null;
  status: string;
  enabled: boolean;
  createdAt: string;
  lastModifiedAt: string;
}

export interface CreateManagerRequest {
  email: string;
  displayName: string;
  givenName: string;
  familyName: string;
  phoneNumber: string;
}

export interface PaginationOptions {
  limit?: number;
  paginationToken?: string;
}

export interface PaginatedManagers {
  managers: ManagerSummary[];
  paginationToken?: string;
  hasMore: boolean;
}

/**
 * List users from the Manager Cognito User Pool with pagination support.
 * Maps Cognito attributes to our ManagerSummary shape.
 */
export const listManagers = async (
  userPoolId: string, 
  options: PaginationOptions = {}
): Promise<PaginatedManagers> => {
  const { limit = 60, paginationToken } = options;
  
  const command = new ListUsersCommand({
    UserPoolId: userPoolId,
    Limit: Math.min(limit, 60), // Cap at 60 for safety
    PaginationToken: paginationToken,
  });

  const result = await client.send(command);

  const managers = (
    result.Users?.map((user: UserType) => {
      const attrs = user.Attributes?.reduce((acc: Record<string, string>, attr: AttributeType) => {
        acc[attr.Name!] = attr.Value!;
        return acc;
      }, {} as Record<string, string>) ?? {};

      return {
        cognitoSub: user.Attributes?.find((a: AttributeType) => a.Name === 'sub')?.Value ?? '',
        username: user.Username ?? '',
        email: attrs.email ?? null,
        displayName: attrs.name ?? null,
        givenName: attrs.given_name ?? null,
        familyName: attrs.family_name ?? null,
        phoneNumber: attrs.phone_number ?? null,
        status: user.UserStatus ?? '',
        enabled: user.Enabled ?? false,
        createdAt: user.UserCreateDate?.toISOString() ?? '',
        lastModifiedAt: user.UserLastModifiedDate?.toISOString() ?? '',
      };
    }) ?? []
  );

  return {
    managers,
    paginationToken: result.PaginationToken,
    hasMore: !!result.PaginationToken,
  };
};

/**
 * Create a manager in the Manager Cognito User Pool and send an invite email.
 * Uses standard Cognito attributes (no custom attributes in v1).
 */
export const createManager = async (
  userPoolId: string,
  payload: CreateManagerRequest,
): Promise<ManagerSummary> => {
  // Step 1: Create the user and send invite email
  const createCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: payload.email,
    UserAttributes: [
      { Name: 'email', Value: payload.email },
      { Name: 'name', Value: payload.displayName },
      { Name: 'given_name', Value: payload.givenName },
      { Name: 'family_name', Value: payload.familyName },
      { Name: 'phone_number', Value: payload.phoneNumber },
    ],
    DesiredDeliveryMediums: ['EMAIL'],
  });

  const result = await client.send(createCommand);

  // Map the created user to ManagerSummary shape
  const attrs = result.User?.Attributes?.reduce((acc: Record<string, string>, attr: AttributeType) => {
    acc[attr.Name!] = attr.Value!;
    return acc;
  }, {} as Record<string, string>) ?? {};

  return {
    cognitoSub: result.User?.Attributes?.find((a: AttributeType) => a.Name === 'sub')?.Value ?? '',
    username: result.User?.Username ?? '',
    email: attrs.email ?? null,
    displayName: attrs.name ?? null,
    givenName: attrs.given_name ?? null,
    familyName: attrs.family_name ?? null,
    phoneNumber: attrs.phone_number ?? null,
    status: result.User?.UserStatus ?? '',
    enabled: result.User?.Enabled ?? false,
    createdAt: result.User?.UserCreateDate?.toISOString() ?? '',
    lastModifiedAt: result.User?.UserLastModifiedDate?.toISOString() ?? '',
  };
};

