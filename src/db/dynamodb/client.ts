import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { dynamoConfig } from '../../config/env';

let client: DynamoDBClient | undefined;
let docClient: DynamoDBDocumentClient | undefined;

const getClient = (): DynamoDBDocumentClient => {
  if (!client) {
    client = new DynamoDBClient({
      region: dynamoConfig.region,
      endpoint: dynamoConfig.endpoint,
    });
  }

  if (!docClient) {
    docClient = DynamoDBDocumentClient.from(client);
  }

  return docClient;
};

export const pingDynamo = async (): Promise<void> => {
  const dc = getClient();
  // Simple call to ensure DynamoDB is reachable
  await dc.send(new ListTablesCommand({ Limit: 1 }));
};
