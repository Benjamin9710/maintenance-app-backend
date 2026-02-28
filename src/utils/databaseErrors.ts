import { ConflictError, ValidationError } from './errors';

/**
 * PostgreSQL error interface for database error handling
 */
interface PostgresError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
  column?: string;
}

/**
 * Postgres error codes that we want to handle specifically
 */
export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
} as const;

/**
 * Handles database errors and converts them to appropriate custom error types
 */
export const handleDatabaseError = (error: unknown): Error => {
  if (error instanceof Error) {
    // Check for Postgres error with code
    const postgresError = error as PostgresError;
    if (postgresError.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
      // Parse the constraint name to provide a more specific error message
      const constraintName = postgresError.constraint || postgresError.detail;
      
      if (constraintName?.includes('idx_properties_unique_name_per_manager')) {
        return new ConflictError('Property name must be unique per manager for active properties');
      }
      
      return new ConflictError('A record with this value already exists');
    }
    
    if (postgresError.code === POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION) {
      const columnName = postgresError.column || 'required field';
      return new ValidationError(`Missing required field: ${columnName}`);
    }
    
    if (postgresError.code === POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
      return new ValidationError('Referenced record does not exist');
    }
    
    if (postgresError.code === POSTGRES_ERROR_CODES.CHECK_VIOLATION) {
      return new ValidationError('Data validation failed');
    }
  }
  
  // If it's already one of our custom errors, return as-is
  if (error instanceof Error && 
      ['ValidationError', 'ConflictError', 'NotFoundError', 'AuthenticationError', 'AuthorizationError'].includes(error.name)) {
    return error;
  }
  
  // Otherwise, wrap in a generic Error
  return error instanceof Error ? error : new Error(String(error));
};
