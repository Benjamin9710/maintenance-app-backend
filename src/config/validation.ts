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
    'DYNAMO_REGION',
    'DYNAMO_SESSIONS_TABLE_NAME',
  ];

  // Add user pool ID based on which pool is available
  if (process.env.COGNITO_MANAGER_USER_POOL_ID) {
    requiredVars.push('COGNITO_MANAGER_USER_POOL_ID');
  } else if (process.env.COGNITO_CONTRACTOR_USER_POOL_ID) {
    requiredVars.push('COGNITO_CONTRACTOR_USER_POOL_ID');
  } else {
    // If neither is present, that's an error
    throw new ConfigurationError(
      'Missing required environment variable: either COGNITO_MANAGER_USER_POOL_ID or COGNITO_CONTRACTOR_USER_POOL_ID must be set'
    );
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate specific variable formats
  const region = process.env.DYNAMO_REGION!;
  const validRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-2'];
  if (!validRegions.includes(region)) {
    throw new ConfigurationError(`Unsupported DYNAMO_REGION: ${region}`);
  }

  const tableName = process.env.DYNAMO_SESSIONS_TABLE_NAME!;
  if (tableName.length === 0) {
    throw new ConfigurationError('DYNAMO_SESSIONS_TABLE_NAME cannot be empty');
  }

  // Validate user pool ID format for whichever pool is set
  const managerPoolId = process.env.COGNITO_MANAGER_USER_POOL_ID;
  const contractorPoolId = process.env.COGNITO_CONTRACTOR_USER_POOL_ID;
  
  if (managerPoolId) {
    if (!managerPoolId.startsWith('us-') && !managerPoolId.startsWith('eu-') && !managerPoolId.startsWith('ap-')) {
      throw new ConfigurationError('Invalid COGNITO_MANAGER_USER_POOL_ID format');
    }
  }
  
  if (contractorPoolId) {
    if (!contractorPoolId.startsWith('us-') && !contractorPoolId.startsWith('eu-') && !contractorPoolId.startsWith('ap-')) {
      throw new ConfigurationError('Invalid COGNITO_CONTRACTOR_USER_POOL_ID format');
    }
  }
};
