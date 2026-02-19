import { ConfigurationError } from '../utils/errors';

/**
 * Validates that all required environment variables are present.
 * Throws ConfigurationError if any required variable is missing.
 * Call this at application startup to fail fast on configuration issues.
 */
export const validateEnvironmentVariables = (): void => {
  // Skip validation during testing
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    return;
  }

  const requiredVars = [
    'COGNITO_MANAGER_USER_POOL_ID',
    'DYNAMO_REGION',
    'DYNAMO_SESSIONS_TABLE_NAME',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate specific variable formats
  const userPoolId = process.env.COGNITO_MANAGER_USER_POOL_ID!;
  if (!userPoolId.startsWith('us-') && !userPoolId.startsWith('eu-') && !userPoolId.startsWith('ap-')) {
    throw new ConfigurationError('Invalid COGNITO_MANAGER_USER_POOL_ID format');
  }

  const region = process.env.DYNAMO_REGION!;
  const validRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-2'];
  if (!validRegions.includes(region)) {
    throw new ConfigurationError(`Unsupported DYNAMO_REGION: ${region}`);
  }

  const tableName = process.env.DYNAMO_SESSIONS_TABLE_NAME!;
  if (tableName.length === 0) {
    throw new ConfigurationError('DYNAMO_SESSIONS_TABLE_NAME cannot be empty');
  }
};
