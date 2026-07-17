/** Plan lifecycle statuses (Angular `isPlanStatus` / plan status model). */
export type PlanStatus =
  | "planning"
  | "completed"
  | "verified"
  | "allocated"
  | "failed";

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  planning: "Planning",
  completed: "Completed",
  verified: "Verified",
  allocated: "Allocated",
  failed: "Failed",
};

export function formatPlanStatus(status: string): string {
  return PLAN_STATUS_LABELS[status as PlanStatus] ?? status;
}

export type PlanRateType = "hourly" | "project" | "plan_hourly" | "plan_project";

export const PLAN_RATE_TYPE_LABELS: Record<PlanRateType, string> = {
  hourly: "Hourly - Customer default",
  project: "Project - Customer default",
  plan_hourly: "Hourly - One-time override",
  plan_project: "Project - One-time override",
};

export const PLAN_RATE_TYPE_OPTIONS = Object.entries(PLAN_RATE_TYPE_LABELS) as [
  PlanRateType,
  string,
][];

export type QuestionRequestKind =
  | "text"
  | "true_false"
  | "checklist"
  | "multiple_choice"
  | "number";

export const QUESTION_REQUEST_KIND_LABELS: Record<QuestionRequestKind, string> = {
  text: "Text",
  true_false: "Yes/No",
  checklist: "Checklist",
  multiple_choice: "Multiple choice",
  number: "Number",
};

export const QUESTION_REQUEST_KIND_OPTIONS = Object.entries(
  QUESTION_REQUEST_KIND_LABELS,
) as [QuestionRequestKind, string][];

export type PlanEditorTab =
  | "details"
  | "stores"
  | "visits"
  | "photos"
  | "questions"
  | "documents";
