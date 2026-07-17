/**
 * User roles as defined by the backend (mirrors the Angular app's
 * `models/user/user-role.ts`). Values are the exact strings the API returns.
 */
export enum UserRole {
  DEMO_USER = "demo_user",
  SYS_ADMIN = "sys_admin",
  OPERATIONS = "operations",
  FINANCES = "finances",
  ACCOUNT_MANAGER = "account_manager",
  FIELD_SUPERVISOR = "field_supervisor",
  SR_FIELD_SUPERVISOR = "sr_field_supervisor",
  FIELD_REP = "field_rep",
  CUSTOMER_ACCOUNT = "customer_account",
  RETAILER_ACCOUNT = "retailer_account",
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.DEMO_USER]: "Demo User",
  [UserRole.SYS_ADMIN]: "Sys Admin",
  [UserRole.OPERATIONS]: "Operations",
  [UserRole.FINANCES]: "Finances",
  [UserRole.ACCOUNT_MANAGER]: "Account Manager",
  [UserRole.FIELD_SUPERVISOR]: "Field Supervisor",
  [UserRole.SR_FIELD_SUPERVISOR]: "Field Supervisor*",
  [UserRole.FIELD_REP]: "Field Rep",
  [UserRole.CUSTOMER_ACCOUNT]: "Customer Account",
  [UserRole.RETAILER_ACCOUNT]: "Retailer Account",
};

export function formatUserRole(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/**
 * Post-login landing route per role. Mirrors `SessionService._openInitialPage`
 * in the Angular app exactly — keep the two in sync until cutover.
 */
export function initialRouteForRole(role: UserRole): string {
  switch (role) {
    case UserRole.OPERATIONS:
    case UserRole.ACCOUNT_MANAGER:
    case UserRole.FIELD_SUPERVISOR:
    case UserRole.SR_FIELD_SUPERVISOR:
    case UserRole.CUSTOMER_ACCOUNT:
      return "/review";
    case UserRole.FIELD_REP:
      return "/itinerary";
    default:
      return "/dashboard";
  }
}
