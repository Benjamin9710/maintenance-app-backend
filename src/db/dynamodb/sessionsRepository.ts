import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getClient } from './client';
import { dynamoConfig } from '../../config/env';

export interface SessionRecord {
  PK: string;
  SK: string;
  SessionId: string;
  UserSub: string;
  CreatedAt: string;
  ExpiresAt: number;
  TokenHash: string;
  Email?: string;
  LoggedOutAt?: string;
}

export const createSessionForUser = async (
  userSub: string,
  sessionId: string,
  tokenHash: string,
  expiresAt: number,
  email: string | null,
): Promise<void> => {
  const client = getClient();

  const now = new Date();
  const createdAt = now.toISOString();

  const item: SessionRecord = {
    PK: `USER#${userSub}`,
    SK: `SESSION#${sessionId}`,
    SessionId: sessionId,
    UserSub: userSub,
    CreatedAt: createdAt,
    ExpiresAt: expiresAt,
    TokenHash: tokenHash,
  };

  if (email) {
    item.Email = email;
  }

  await client.send(
    new PutCommand({
      TableName: dynamoConfig.sessionsTableName,
      Item: item,
    }),
  );
};

export const getSessionById = async (
  userSub: string,
  sessionId: string,
): Promise<SessionRecord | null> => {
  const client = getClient();

  const result = await client.send(
    new GetCommand({
      TableName: dynamoConfig.sessionsTableName,
      Key: {
        PK: `USER#${userSub}`,
        SK: `SESSION#${sessionId}`,
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  return result.Item as SessionRecord;
};

export const markSessionLoggedOut = async (
  userSub: string,
  sessionId: string,
  loggedOutAt: string,
): Promise<boolean> => {
  const client = getClient();
  const expiresNow = Math.floor(Date.now() / 1000);

  try {
    await client.send(
      new UpdateCommand({
        TableName: dynamoConfig.sessionsTableName,
        Key: {
          PK: `USER#${userSub}`,
          SK: `SESSION#${sessionId}`,
        },
        UpdateExpression: 'SET LoggedOutAt = :loggedOutAt, ExpiresAt = :expiresNow',
        ConditionExpression: 'attribute_exists(SessionId)',
        ExpressionAttributeValues: {
          ':loggedOutAt': loggedOutAt,
          ':expiresNow': expiresNow,
        },
      }),
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }

    throw error;
  }
};
