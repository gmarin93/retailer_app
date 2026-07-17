import {
  isCustomerAccount,
  isElevated,
  isElevatedOrManagerOrSupervisor,
} from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";

/** Column keys for the jobs table (ported from `jobs-list-columns.ts`). */
export type JobsColumnKey =
  | "user"
  | "id"
  | "rep_no"
  | "cycle"
  | "customer"
  | "program"
  | "group"
  | "retailer"
  | "store"
  | "opensAt"
  | "closesAt"
  | "completedOn"
  | "plannedMinutes"
  | "actualMinutes"
  | "status"
  | "status_code";

const ELEVATED: JobsColumnKey[] = [
  "user",
  "id",
  "rep_no",
  "cycle",
  "customer",
  "program",
  "group",
  "retailer",
  "store",
  "opensAt",
  "closesAt",
  "completedOn",
  "plannedMinutes",
  "actualMinutes",
  "status",
  "status_code",
];

const CUSTOMER: JobsColumnKey[] = [
  "id",
  "program",
  "retailer",
  "store",
  "completedOn",
  "actualMinutes",
  "status",
  "status_code",
];

const BASIC: JobsColumnKey[] = [
  "id",
  "customer",
  "program",
  "retailer",
  "store",
  "opensAt",
  "closesAt",
  "completedOn",
  "plannedMinutes",
  "actualMinutes",
  "status",
  "status_code",
];

/** Role-based column set; archives can hide status columns. */
export function jobsColumnsForRole(
  role: UserRole,
  options?: { showStatus?: boolean },
): JobsColumnKey[] {
  const showStatus = options?.showStatus ?? true;
  let columns: JobsColumnKey[];
  if (isCustomerAccount(role)) columns = CUSTOMER;
  else if (isElevated(role) || isElevatedOrManagerOrSupervisor(role)) columns = ELEVATED;
  else columns = BASIC;

  if (!showStatus) {
    columns = columns.filter((key) => key !== "status" && key !== "status_code");
  }
  return columns;
}
