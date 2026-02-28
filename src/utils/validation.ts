import type { CreateManagerRequest } from "../services/cognitoManagers";
import type { CreateContractorRequest } from "../services/cognitoContractors";
import type {
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "../db/postgres/propertiesRepository";
import { ValidationError } from "./errors";
import { validateTimezone } from "./timezoneValidation";

/**
 * Validates and parses a request body as a CreateManagerRequest.
 * Throws ValidationError if validation fails.
 */
export const validateCreateManagerRequest = (
  body: unknown,
): CreateManagerRequest => {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid request body: must be an object");
  }

  const payload = body as Record<string, unknown>;

  // Validate required fields
  const requiredFields: (keyof CreateManagerRequest)[] = [
    "email",
    "displayName",
    "givenName",
    "familyName",
    "phoneNumber",
  ];
  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== "string") {
      throw new ValidationError(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate email format
  const email = payload.email as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }

  // Validate phone number format (basic E.164 validation)
  const phoneNumber = payload.phoneNumber as string;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ValidationError(
      "Invalid phone number format (use E.164 format like +61400111222)",
    );
  }

  // Validate name fields are not empty
  const displayName = payload.displayName as string;
  const givenName = payload.givenName as string;
  const familyName = payload.familyName as string;

  if (displayName.trim().length === 0) {
    throw new ValidationError("Display name cannot be empty");
  }
  if (givenName.trim().length === 0) {
    throw new ValidationError("Given name cannot be empty");
  }
  if (familyName.trim().length === 0) {
    throw new ValidationError("Family name cannot be empty");
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
export const validateCreateContractorRequest = (
  body: unknown,
): CreateContractorRequest => {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid request body: must be an object");
  }

  const payload = body as Record<string, unknown>;

  // Validate required fields
  const requiredFields: (keyof CreateContractorRequest)[] = [
    "email",
    "displayName",
    "givenName",
    "familyName",
    "phoneNumber",
  ];
  for (const field of requiredFields) {
    if (!payload[field] || typeof payload[field] !== "string") {
      throw new ValidationError(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate email format
  const email = payload.email as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }

  // Validate phone number format (basic E.164 validation)
  const phoneNumber = payload.phoneNumber as string;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ValidationError(
      "Invalid phone number format (use E.164 format like +61400111222)",
    );
  }

  // Validate name fields are not empty
  const displayName = payload.displayName as string;
  const givenName = payload.givenName as string;
  const familyName = payload.familyName as string;

  if (displayName.trim().length === 0) {
    throw new ValidationError("Display name cannot be empty");
  }
  if (givenName.trim().length === 0) {
    throw new ValidationError("Given name cannot be empty");
  }
  if (familyName.trim().length === 0) {
    throw new ValidationError("Family name cannot be empty");
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
 * Validates and parses a request body as a CreatePropertyPayload.
 * Throws ValidationError if validation fails.
 */
export const validateCreatePropertyRequest = (
  body: unknown,
): CreatePropertyPayload => {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid request body: must be an object");
  }

  const payload = body as Record<string, unknown>;

  // Map frontend camelCase to backend snake_case
  const mappedPayload = {
    name: payload.name,
    address_line1: payload.addressLine1 || payload.address_line1,
    address_line2: payload.addressLine2 || payload.address_line2,
    suburb: payload.suburb,
    state: payload.state,
    postcode: payload.postcode,
    country: payload.country,
    timezone: payload.timezone,
  };

  // Validate required fields
  const requiredFields: (keyof CreatePropertyPayload)[] = [
    "name",
    "address_line1",
    "suburb",
    "state",
    "postcode",
    "country",
  ];
  for (const field of requiredFields) {
    if (!mappedPayload[field] || typeof mappedPayload[field] !== "string") {
      throw new ValidationError(`Missing or invalid required field: ${field}`);
    }
  }

  // Validate field lengths and formats
  const name = mappedPayload.name as string;
  const address_line1 = mappedPayload.address_line1 as string;
  const suburb = mappedPayload.suburb as string;
  const state = mappedPayload.state as string;
  const postcode = mappedPayload.postcode as string;
  const country = mappedPayload.country as string;

  if (name.trim().length === 0) {
    throw new ValidationError("Property name cannot be empty");
  }
  if (name.length > 200) {
    throw new ValidationError("Property name must be 200 characters or less");
  }

  if (address_line1.trim().length === 0) {
    throw new ValidationError("Address line 1 cannot be empty");
  }
  if (address_line1.length > 500) {
    throw new ValidationError("Address line 1 must be 500 characters or less");
  }

  if (suburb.trim().length === 0) {
    throw new ValidationError("Suburb cannot be empty");
  }
  if (suburb.length > 100) {
    throw new ValidationError("Suburb must be 100 characters or less");
  }

  if (state.trim().length === 0) {
    throw new ValidationError("State cannot be empty");
  }
  if (state.length > 50) {
    throw new ValidationError("State must be 50 characters or less");
  }

  if (postcode.trim().length === 0) {
    throw new ValidationError("Postcode cannot be empty");
  }
  if (postcode.length > 20) {
    throw new ValidationError("Postcode must be 20 characters or less");
  }

  if (country.trim().length === 0) {
    throw new ValidationError("Country cannot be empty");
  }
  if (country.length !== 2) {
    throw new ValidationError("Country must be a 2-character ISO code");
  }

  // Optional fields
  let address_line2: string | undefined = undefined;
  let timezone: string | undefined = undefined;

  if (mappedPayload.address_line2) {
    if (typeof mappedPayload.address_line2 !== "string") {
      throw new ValidationError("Address line 2 must be a string");
    }
    address_line2 = mappedPayload.address_line2 as string;
    if (address_line2.length > 500) {
      throw new ValidationError(
        "Address line 2 must be 500 characters or less",
      );
    }
  }

  if (mappedPayload.timezone) {
    if (typeof mappedPayload.timezone !== "string") {
      throw new ValidationError("Timezone must be a string");
    }
    timezone = mappedPayload.timezone as string;
    if (timezone.length > 50) {
      throw new ValidationError("Timezone must be 50 characters or less");
    }

    // Validate IANA timezone format
    const timezoneError = validateTimezone(timezone.trim());
    if (timezoneError) {
      throw new ValidationError(timezoneError);
    }
  }

  return {
    name: name.trim(),
    address_line1: address_line1.trim(),
    address_line2: address_line2?.trim(),
    suburb: suburb.trim(),
    state: state.trim(),
    postcode: postcode.trim(),
    country: country.trim().toUpperCase(),
    timezone: timezone?.trim(),
  };
};

/**
 * Validates and parses a request body as an UpdatePropertyPayload.
 * Throws ValidationError if validation fails.
 */
export const validateUpdatePropertyRequest = (
  body: unknown,
): UpdatePropertyPayload => {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid request body: must be an object");
  }

  const payload = body as Record<string, unknown>;

  // At least one field must be provided
  if (Object.keys(payload).length === 0) {
    throw new ValidationError("At least one field must be provided for update");
  }

  const updateData: UpdatePropertyPayload = {};

  // Validate optional fields if provided
  if (payload.name !== undefined) {
    if (typeof payload.name !== "string") {
      throw new ValidationError("name must be a string");
    }
    const name = payload.name as string;
    if (name.trim().length === 0) {
      throw new ValidationError("Property name cannot be empty");
    }
    if (name.length > 200) {
      throw new ValidationError("Property name must be 200 characters or less");
    }
    updateData.name = name.trim();
  }

  if (payload.address_line1 !== undefined) {
    if (typeof payload.address_line1 !== "string") {
      throw new ValidationError("address_line1 must be a string");
    }
    const address_line1 = payload.address_line1 as string;
    if (address_line1.trim().length === 0) {
      throw new ValidationError("Address line 1 cannot be empty");
    }
    if (address_line1.length > 500) {
      throw new ValidationError(
        "Address line 1 must be 500 characters or less",
      );
    }
    updateData.address_line1 = address_line1.trim();
  }

  if (payload.address_line2 !== undefined) {
    if (typeof payload.address_line2 !== "string") {
      throw new ValidationError("address_line2 must be a string");
    }
    const address_line2 = payload.address_line2 as string;
    if (address_line2.length > 500) {
      throw new ValidationError(
        "Address line 2 must be 500 characters or less",
      );
    }
    updateData.address_line2 = address_line2.trim();
  }

  if (payload.suburb !== undefined) {
    if (typeof payload.suburb !== "string") {
      throw new ValidationError("suburb must be a string");
    }
    const suburb = payload.suburb as string;
    if (suburb.trim().length === 0) {
      throw new ValidationError("Suburb cannot be empty");
    }
    if (suburb.length > 100) {
      throw new ValidationError("Suburb must be 100 characters or less");
    }
    updateData.suburb = suburb.trim();
  }

  if (payload.state !== undefined) {
    if (typeof payload.state !== "string") {
      throw new ValidationError("state must be a string");
    }
    const state = payload.state as string;
    if (state.trim().length === 0) {
      throw new ValidationError("State cannot be empty");
    }
    if (state.length > 50) {
      throw new ValidationError("State must be 50 characters or less");
    }
    updateData.state = state.trim();
  }

  if (payload.postcode !== undefined) {
    if (typeof payload.postcode !== "string") {
      throw new ValidationError("postcode must be a string");
    }
    const postcode = payload.postcode as string;
    if (postcode.trim().length === 0) {
      throw new ValidationError("Postcode cannot be empty");
    }
    if (postcode.length > 20) {
      throw new ValidationError("Postcode must be 20 characters or less");
    }
    updateData.postcode = postcode.trim();
  }

  if (payload.country !== undefined) {
    if (typeof payload.country !== "string") {
      throw new ValidationError("country must be a string");
    }
    const country = payload.country as string;
    if (country.trim().length === 0) {
      throw new ValidationError("Country cannot be empty");
    }
    if (country.length !== 2) {
      throw new ValidationError("Country must be a 2-character ISO code");
    }
    updateData.country = country.trim().toUpperCase();
  }

  if (payload.timezone !== undefined) {
    if (typeof payload.timezone !== "string") {
      throw new ValidationError("timezone must be a string");
    }
    const timezone = payload.timezone as string;
    if (timezone.length > 50) {
      throw new ValidationError("Timezone must be 50 characters or less");
    }

    // Validate IANA timezone format (only if not empty)
    const trimmedTimezone = timezone.trim();
    if (trimmedTimezone) {
      const timezoneError = validateTimezone(trimmedTimezone);
      if (timezoneError) {
        throw new ValidationError(timezoneError);
      }
    }

    updateData.timezone = trimmedTimezone;
  }

  return updateData;
};
