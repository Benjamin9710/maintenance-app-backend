import type { Property } from "../db/postgres/propertiesRepository";

export interface AuditLogEntry {
  timestamp?: string; // Optional for helper functions, will be set in logAuditEvent
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "READ";
  resourceType: "property";
  resourceId: string;
  userId: string;
  userPersona: "admin" | "manager" | "contractor";
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Logs audit events for property operations
 * In production, this would write to a secure audit log system
 * For now, we'll use console logging with structured format
 */
export const logAuditEvent = (entry: AuditLogEntry): void => {
  const auditLog = {
    ...entry,
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || "unknown",
  };

  // In production, this would be sent to a secure logging system
  // For now, using structured console logging
  console.log("AUDIT_EVENT", JSON.stringify(auditLog));
};

/**
 * Creates an audit log entry for property creation
 */
export const logPropertyCreated = (
  property: Property,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
): void => {
  logAuditEvent({
    action: "CREATE",
    resourceType: "property",
    resourceId: property.id,
    userId,
    userPersona,
    metadata: {
      owner_manager_sub: property.owner_manager_sub,
      property_name: property.name,
    },
  });
};

/**
 * Creates an audit log entry for property updates
 */
export const logPropertyUpdated = (
  oldProperty: Property,
  newProperty: Property,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
): void => {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  // Compare fields and record changes
  const fieldsToCompare: (keyof Property)[] = [
    "name",
    "address_line1",
    "address_line2",
    "suburb",
    "state",
    "postcode",
    "country",
    "timezone",
  ];

  for (const field of fieldsToCompare) {
    if (oldProperty[field] !== newProperty[field]) {
      changes[field] = {
        from: oldProperty[field],
        to: newProperty[field],
      };
    }
  }

  logAuditEvent({
    action: "UPDATE",
    resourceType: "property",
    resourceId: newProperty.id,
    userId,
    userPersona,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    metadata: {
      owner_manager_sub: newProperty.owner_manager_sub,
      property_name: newProperty.name,
      fields_changed: Object.keys(changes).length,
    },
  });
};

/**
 * Creates an audit log entry for property archival
 */
export const logPropertyArchived = (
  property: Property,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
): void => {
  logAuditEvent({
    action: "ARCHIVE",
    resourceType: "property",
    resourceId: property.id,
    userId,
    userPersona,
    metadata: {
      owner_manager_sub: property.owner_manager_sub,
      property_name: property.name,
      archived_at: property.archived_at,
    },
  });
};

/**
 * Creates an audit log entry for property read operations
 */
export const logPropertyRead = (
  property: Property,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
): void => {
  logAuditEvent({
    action: "READ",
    resourceType: "property",
    resourceId: property.id,
    userId,
    userPersona,
    metadata: {
      owner_manager_sub: property.owner_manager_sub,
      property_name: property.name,
      is_archived: !!property.archived_at,
    },
  });
};

/**
 * Creates an audit log entry for failed property creation
 */
export const logPropertyCreateFailed = (
  propertyData: unknown,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
  errorReason: string,
): void => {
  logAuditEvent({
    action: "CREATE",
    resourceType: "property",
    resourceId: "failed",
    userId,
    userPersona,
    metadata: {
      property_data: propertyData,
      error_reason: errorReason,
    },
  });
};

/**
 * Creates an audit log entry for failed property updates
 */
export const logPropertyUpdateFailed = (
  propertyId: string,
  updateData: unknown,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
  errorReason: string,
): void => {
  logAuditEvent({
    action: "UPDATE",
    resourceType: "property",
    resourceId: propertyId,
    userId,
    userPersona,
    metadata: {
      update_data: updateData,
      error_reason: errorReason,
    },
  });
};

/**
 * Creates an audit log entry for failed property archival
 */
export const logPropertyArchiveFailed = (
  propertyId: string,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
  errorReason: string,
): void => {
  logAuditEvent({
    action: "ARCHIVE",
    resourceType: "property",
    resourceId: propertyId,
    userId,
    userPersona,
    metadata: {
      error_reason: errorReason,
    },
  });
};

/**
 * Creates an audit log entry for failed property read operations
 */
export const logPropertyReadFailed = (
  propertyId: string,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
  errorReason: string,
): void => {
  logAuditEvent({
    action: "READ",
    resourceType: "property",
    resourceId: propertyId,
    userId,
    userPersona,
    metadata: {
      error_reason: errorReason,
    },
  });
};

/**
 * Creates an audit log entry for property list operations
 */
export const logPropertyList = (
  ownerManagerSub: string,
  propertyCount: number,
  includeArchived: boolean,
  userId: string,
  userPersona: "admin" | "manager" | "contractor",
): void => {
  logAuditEvent({
    action: "READ",
    resourceType: "property",
    resourceId: "list",
    userId,
    userPersona,
    metadata: {
      owner_manager_sub: ownerManagerSub,
      property_count: propertyCount,
      include_archived: includeArchived,
    },
  });
};
