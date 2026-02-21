import type { CreateManagerRequest } from '../services/cognitoManagers';
import type { CreateContractorRequest } from '../services/cognitoContractors';
import { ValidationError } from './errors';

/**
 * Validates and parses a request body as a CreateManagerRequest.
 * Throws ValidationError if validation fails.
 */
export const validateCreateManagerRequest = (body: unknown): CreateManagerRequest => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body: must be an object');
  }

  const payload = body as Record<string, unknown>;

  // Validate required fields
  const requiredFields: (keyof CreateManagerRequest)[] = ['email', 'displayName', 'givenName', 'familyName', 'phoneNumber'];
  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== 'string') {
      throw new ValidationError(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate email format
  const email = payload.email as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate phone number format (basic E.164 validation)
  const phoneNumber = payload.phoneNumber as string;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ValidationError('Invalid phone number format (use E.164 format like +61400111222)');
  }

  // Validate name fields are not empty
  const displayName = payload.displayName as string;
  const givenName = payload.givenName as string;
  const familyName = payload.familyName as string;

  if (displayName.trim().length === 0) {
    throw new ValidationError('Display name cannot be empty');
  }
  if (givenName.trim().length === 0) {
    throw new ValidationError('Given name cannot be empty');
  }
  if (familyName.trim().length === 0) {
    throw new ValidationError('Family name cannot be empty');
  }

  return {
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    givenName: givenName.trim(),
    familyName: familyName.trim(),
    phoneNumber: phoneNumber.trim(),
  };
};

/**
 * Validates and parses a request body as a CreateContractorRequest.
 * Throws ValidationError if validation fails.
 */
export const validateCreateContractorRequest = (body: unknown): CreateContractorRequest => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body: must be an object');
  }

  const payload = body as Record<string, unknown>;

  // Validate required fields
  const requiredFields: (keyof CreateContractorRequest)[] = ['email', 'displayName', 'givenName', 'familyName', 'phoneNumber'];
  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== 'string') {
      throw new ValidationError(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate email format
  const email = payload.email as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate phone number format (basic E.164 validation)
  const phoneNumber = payload.phoneNumber as string;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ValidationError('Invalid phone number format (use E.164 format like +61400111222)');
  }

  // Validate name fields are not empty
  const displayName = payload.displayName as string;
  const givenName = payload.givenName as string;
  const familyName = payload.familyName as string;

  if (displayName.trim().length === 0) {
    throw new ValidationError('Display name cannot be empty');
  }
  if (givenName.trim().length === 0) {
    throw new ValidationError('Given name cannot be empty');
  }
  if (familyName.trim().length === 0) {
    throw new ValidationError('Family name cannot be empty');
  }

  return {
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    givenName: givenName.trim(),
    familyName: familyName.trim(),
    phoneNumber: phoneNumber.trim(),
  };
};
