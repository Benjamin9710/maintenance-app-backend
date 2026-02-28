import type { ManagerSummary } from '../services/cognitoManagers';
import type { ContractorSummary } from '../services/cognitoContractors';

/**
 * Audit logging for user management operations
 */

export const logManagerCreated = (
  manager: ManagerSummary,
  userId: string,
  userPersona: 'admin' | 'manager' | 'contractor'
): void => {
  console.log('AUDIT_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'CREATE',
    resourceType: 'manager',
    resourceId: manager.cognitoSub,
    userId,
    userPersona,
    metadata: {
      manager_email: manager.email,
      manager_name: manager.displayName || `${manager.givenName} ${manager.familyName}`.trim(),
      environment: process.env.ENVIRONMENT || 'unknown',
    },
  }));
};

export const logManagerList = (
  managerCount: number,
  includePagination: boolean,
  userId: string,
  userPersona: 'admin' | 'manager' | 'contractor'
): void => {
  console.log('AUDIT_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'READ',
    resourceType: 'manager',
    resourceId: 'list',
    userId,
    userPersona,
    metadata: {
      manager_count: managerCount,
      include_pagination: includePagination,
      environment: process.env.ENVIRONMENT || 'unknown',
    },
  }));
};

export const logContractorCreated = (
  contractor: ContractorSummary,
  userId: string,
  userPersona: 'admin' | 'manager' | 'contractor'
): void => {
  console.log('AUDIT_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'CREATE',
    resourceType: 'contractor',
    resourceId: contractor.cognitoSub,
    userId,
    userPersona,
    metadata: {
      contractor_email: contractor.email,
      contractor_name: contractor.displayName || `${contractor.givenName} ${contractor.familyName}`.trim(),
      environment: process.env.ENVIRONMENT || 'unknown',
    },
  }));
};

export const logContractorList = (
  contractorCount: number,
  includePagination: boolean,
  userId: string,
  userPersona: 'admin' | 'manager' | 'contractor'
): void => {
  console.log('AUDIT_EVENT', JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'READ',
    resourceType: 'contractor',
    resourceId: 'list',
    userId,
    userPersona,
    metadata: {
      contractor_count: contractorCount,
      include_pagination: includePagination,
      environment: process.env.ENVIRONMENT || 'unknown',
    },
  }));
};
