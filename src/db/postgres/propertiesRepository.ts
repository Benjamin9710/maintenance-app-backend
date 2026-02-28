import { randomUUID } from "crypto";
import { query } from "./client";
import { handleDatabaseError } from "../../utils/databaseErrors";

export interface Property {
  id: string;
  owner_manager_sub: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  timezone?: string;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
}

export interface CreatePropertyPayload {
  name: string;
  address_line1: string;
  address_line2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  timezone?: string;
}

export interface PropertySearchParams {
  search?: string; // Search across name, address fields
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface PropertySearchResult {
  properties: Property[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface UpdatePropertyPayload {
  name?: string;
  address_line1?: string;
  address_line2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  timezone?: string;
}

export const createProperty = async (
  ownerManagerSub: string,
  payload: CreatePropertyPayload,
): Promise<Property> => {
  const id = randomUUID();

  try {
    const result = await query<Property>(
      `
      INSERT INTO properties (
        id, owner_manager_sub, name, address_line1, address_line2,
        suburb, state, postcode, country, timezone, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        id,
        ownerManagerSub,
        payload.name,
        payload.address_line1,
        payload.address_line2 || null,
        payload.suburb,
        payload.state,
        payload.postcode,
        payload.country,
        payload.timezone || null,
      ],
    );

    if (result.length === 0) {
      throw new Error("Failed to create property");
    }

    return result[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

export const listPropertiesByOwner = async (
  ownerManagerSub: string,
  options: { includeArchived?: boolean } = {},
): Promise<Property[]> => {
  const { includeArchived = false } = options;

  const sql = includeArchived
    ? `
      SELECT * FROM properties 
      WHERE owner_manager_sub = $1 
      ORDER BY created_at DESC
      `
    : `
      SELECT * FROM properties 
      WHERE owner_manager_sub = $1 AND archived_at IS NULL 
      ORDER BY created_at DESC
      `;

  const result = await query<Property>(sql, [ownerManagerSub]);
  return result;
};

export const getPropertyById = async (
  propertyId: string,
): Promise<Property | null> => {
  try {
    const result = await query<Property>(
      "SELECT * FROM properties WHERE id = $1",
      [propertyId],
    );

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

export const updateProperty = async (
  propertyId: string,
  ownerManagerSub: string,
  patch: UpdatePropertyPayload,
): Promise<Property> => {
  // Build dynamic SET clause based on provided fields
  const setFields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  // Only include fields that are actually provided in the patch
  if (patch.name !== undefined) {
    setFields.push(`name = $${paramIndex++}`);
    values.push(patch.name);
  }
  if (patch.address_line1 !== undefined) {
    setFields.push(`address_line1 = $${paramIndex++}`);
    values.push(patch.address_line1);
  }
  if (patch.address_line2 !== undefined) {
    setFields.push(`address_line2 = $${paramIndex++}`);
    values.push(patch.address_line2);
  }
  if (patch.suburb !== undefined) {
    setFields.push(`suburb = $${paramIndex++}`);
    values.push(patch.suburb);
  }
  if (patch.state !== undefined) {
    setFields.push(`state = $${paramIndex++}`);
    values.push(patch.state);
  }
  if (patch.postcode !== undefined) {
    setFields.push(`postcode = $${paramIndex++}`);
    values.push(patch.postcode);
  }
  if (patch.country !== undefined) {
    setFields.push(`country = $${paramIndex++}`);
    values.push(patch.country);
  }
  if (patch.timezone !== undefined) {
    setFields.push(`timezone = $${paramIndex++}`);
    values.push(patch.timezone);
  }

  if (setFields.length === 0) {
    throw new Error("No fields to update");
  }

  // Add WHERE clause parameters
  const propertyIdParam = `$${paramIndex++}`;
  const ownerManagerSubParam = `$${paramIndex++}`;
  values.push(propertyId, ownerManagerSub);

  const sql = `
    UPDATE properties 
    SET ${setFields.join(", ")} 
    WHERE id = ${propertyIdParam} 
      AND owner_manager_sub = ${ownerManagerSubParam}
      AND archived_at IS NULL
    RETURNING *
  `;

  try {
    const result = await query<Property>(sql, values);

    if (result.length === 0) {
      throw new Error(
        "Property not found, not owned by specified manager, or already archived",
      );
    }

    return result[0];
  } catch (error) {
    throw handleDatabaseError(error);
  }
};

export const archiveProperty = async (
  propertyId: string,
  ownerManagerSub: string,
): Promise<Property> => {
  const result = await query<Property>(
    `
    UPDATE properties 
    SET archived_at = NOW() 
    WHERE id = $1 
      AND owner_manager_sub = $2 
      AND archived_at IS NULL
    RETURNING *
    `,
    [propertyId, ownerManagerSub],
  );

  if (result.length === 0) {
    throw new Error(
      "Property not found, not owned by specified manager, or already archived",
    );
  }

  return result[0];
};

export const searchProperties = async (
  ownerManagerSub: string,
  params: PropertySearchParams,
): Promise<PropertySearchResult> => {
  const {
    includeArchived = false,
    search,
    suburb,
    state,
    postcode,
    country,
    limit = 50,
    offset = 0,
  } = params;

  // Validate pagination parameters
  const validatedLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
  const validatedOffset = Math.max(offset, 0); // Non-negative

  // Build WHERE conditions
  const conditions: string[] = ["owner_manager_sub = $1"];
  const values: unknown[] = [ownerManagerSub];
  let paramIndex = 2;

  if (!includeArchived) {
    conditions.push("archived_at IS NULL");
  }

  if (search) {
    conditions.push(`(
      name ILIKE $${paramIndex} OR 
      address_line1 ILIKE $${paramIndex + 1} OR 
      address_line2 ILIKE $${paramIndex + 2} OR 
      suburb ILIKE $${paramIndex + 3}
    )`);
    const searchTerm = `%${search}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    paramIndex += 4;
  }

  if (suburb) {
    conditions.push(`suburb ILIKE $${paramIndex}`);
    values.push(`%${suburb}%`);
    paramIndex++;
  }

  if (state) {
    conditions.push(`state ILIKE $${paramIndex}`);
    values.push(`%${state}%`);
    paramIndex++;
  }

  if (postcode) {
    conditions.push(`postcode ILIKE $${paramIndex}`);
    values.push(`%${postcode}%`);
    paramIndex++;
  }

  if (country) {
    conditions.push(`country ILIKE $${paramIndex}`);
    values.push(`%${country}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  try {
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM properties WHERE ${whereClause}`,
      values,
    );
    const total = parseInt(countResult[0]?.count || "0", 10);

    // Get paginated properties
    const paginationValues = [...values, validatedLimit, validatedOffset];
    const propertiesResult = await query<Property>(
      `SELECT * FROM properties WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      paginationValues,
    );

    return {
      properties: propertiesResult,
      total,
      limit: validatedLimit,
      offset: validatedOffset,
    };
  } catch (error) {
    throw handleDatabaseError(error);
  }
};
