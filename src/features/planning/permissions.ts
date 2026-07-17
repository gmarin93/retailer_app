import {
  isElevated,
  isElevatedOrManager,
} from "@/features/auth/permissions";
import type { UserRole } from "@/features/auth/types";

/** Statuses that allow normal plan editing (Angular `isPlannable`). */
export function isPlannableStatus(status: string): boolean {
  return status === "planning" || status === "completed" || status === "failed";
}

export function canVerifyPlans(role: UserRole): boolean {
  return isElevated(role);
}

export function canAllocatePlans(role: UserRole): boolean {
  return isElevated(role);
}

export function canPlanSurvey(role: UserRole): boolean {
  return isElevated(role);
}

export function canModifyLockedPlanRateType(role: UserRole): boolean {
  return isElevated(role);
}

export function canModifyLockedPlanGroupName(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canModifyLockedPlanStores(role: UserRole): boolean {
  return isElevated(role);
}

export function canModifyLockedPlanVisits(role: UserRole): boolean {
  return isElevated(role);
}

export function canModifyLockedPlanPhotos(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canModifyLockedPlanQuestions(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canModifyLockedPlanDocuments(role: UserRole): boolean {
  return isElevatedOrManager(role);
}

export function canModifySomethingOnLockedPlan(role: UserRole): boolean {
  return (
    canModifyLockedPlanGroupName(role) ||
    canModifyLockedPlanStores(role) ||
    canModifyLockedPlanVisits(role) ||
    canModifyLockedPlanPhotos(role) ||
    canModifyLockedPlanQuestions(role) ||
    canModifyLockedPlanDocuments(role)
  );
}

export function canSavePlan(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifySomethingOnLockedPlan(role);
}

export function canDeletePlan(status: string): boolean {
  return status === "planning" || status === "completed";
}

export function canCompletePlan(status: string): boolean {
  return status === "planning";
}

export function canVerifyPlan(status: string, role: UserRole): boolean {
  return status === "completed" && canVerifyPlans(role);
}

export function canUnverifyPlan(status: string, role: UserRole): boolean {
  return status === "verified" && canVerifyPlans(role);
}

/** Preview dispatch (dry_run) — verified + elevated; readiness gate not required. */
export function canPreviewDispatch(status: string, role: UserRole): boolean {
  return status === "verified" && canAllocatePlans(role);
}

export function canAllocatePlan(
  status: string,
  role: UserRole,
  canAllocateFromReadiness: boolean | null,
): boolean {
  if (status !== "verified" || !canAllocatePlans(role)) return false;
  if (canAllocateFromReadiness == null) return true;
  return canAllocateFromReadiness;
}

export function canEditGroup(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanGroupName(role);
}

export function canEditRate(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanRateType(role);
}

export function canEditStores(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanStores(role);
}

export function canEditVisits(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanVisits(role);
}

export function canEditPhotos(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanPhotos(role);
}

export function canEditQuestions(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanQuestions(role);
}

export function canEditDocuments(status: string, role: UserRole): boolean {
  return isPlannableStatus(status) || canModifyLockedPlanDocuments(role);
}
