export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface DynamoConfig {
  region: string;
  endpoint?: string;
  tablePrefix: string;
  sessionsTableName: string;
}

export const dbConfig: DbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'backend_app',
  user: process.env.DB_USER ?? 'backend_app',
  password: process.env.DB_PASSWORD ?? 'backend_app',
  ssl: process.env.DB_SSL === 'true',
};

export const dynamoConfig: DynamoConfig = {
  region: process.env.DYNAMO_REGION ?? 'us-west-2',
  endpoint: process.env.DYNAMO_ENDPOINT,
  tablePrefix: process.env.DYNAMO_TABLE_PREFIX ?? 'backend-app-',
  sessionsTableName: process.env.DYNAMO_SESSIONS_TABLE_NAME ?? 'backend-app-sessions',
};
