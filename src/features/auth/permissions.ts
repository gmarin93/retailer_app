import { UserRole } from "./types";

/**
 * Role-group predicates ported from the Angular `PermissionsService`.
 * Pure functions over {@link UserRole} so both hooks and plain code can use them.
 */

export function isElevated(role: UserRole): boolean {
  return (
    role === UserRole.SYS_ADMIN || role === UserRole.OPERATIONS || role === UserRole.FINANCES
  );
}

export function isFieldSupervisor(role: UserRole): boolean {
  return role === UserRole.FIELD_SUPERVISOR || role === UserRole.SR_FIELD_SUPERVISOR;
}

export function isElevatedOrManager(role: UserRole): boolean {
  return isElevated(role) || role === UserRole.ACCOUNT_MANAGER;
}

export function isElevatedOrManagerOrSupervisor(role: UserRole): boolean {
  return isElevatedOrManager(role) || isFieldSupervisor(role);
}

/** Elevated/manager roles may submit a report on behalf of an assignee. */
export function canReportOnBehalf(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

/** Review jobs / assignees / status codes (elevated|manager|supervisor). */
export function canReviewJobs(role: UserRole): boolean {
  return isElevatedOrManagerOrSupervisor(role);
}

/** Submit / edit / delete visit reports from Review (elevated|manager|supervisor). */
export function canModifyReports(role: UserRole): boolean {
  return isElevatedOrManagerOrSupervisor(role);
}

export function canBulkEditJobs(role: UserRole): boolean {
  return isElevated(role);
}

export function canBulkExtendJobs(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canBulkReassignJobs(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canBulkCancelJobs(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canBulkReinstateJobs(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canDownloadJobs(role: UserRole): boolean {
  return (
    canReviewJobs(role) ||
    role === UserRole.FIELD_REP ||
    role === UserRole.CUSTOMER_ACCOUNT
  );
}

export function canDownloadJobPhotos(role: UserRole): boolean {
  return canReviewJobs(role) || role === UserRole.CUSTOMER_ACCOUNT;
}

export function isCustomerAccount(role: UserRole): boolean {
  return role === UserRole.CUSTOMER_ACCOUNT;
}
