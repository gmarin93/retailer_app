import { z } from "zod";
import type { PlanRateType, QuestionRequestKind } from "./types";

const bareTitledSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
});

const planCycleSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  starts_on: z.string().nullish(),
  ends_on: z.string().nullish(),
});

export const listablePlanSchema = z.looseObject({
  id: z.number(),
  status: z.string().catch(""),
  group: z.string().catch(""),
  rate_type: z.string().catch(""),
  rate: z.number().catch(0),
  is_survey: z.boolean().catch(false),
  num_stores: z.number().catch(0),
  num_visits: z.number().catch(0),
  num_photo_requests: z.number().catch(0),
  num_question_requests: z.number().catch(0),
  num_documents: z.number().catch(0),
  total_hours: z.number().catch(0),
  total_cost: z.number().catch(0),
  expected_jobs: z.number().catch(0),
  cycle: planCycleSchema.nullish(),
  program: z
    .looseObject({
      id: z.number(),
      title: z.string().catch(""),
      customer: bareTitledSchema.nullish(),
      retailer: bareTitledSchema.nullish(),
    })
    .nullish(),
});

export type ListablePlan = z.infer<typeof listablePlanSchema>;

export const detailedVisitSchema = z.looseObject({
  id: z.number(),
  opens_at: z.union([z.string(), z.date()]),
  closes_at: z.union([z.string(), z.date()]),
  planned_minutes: z.number().catch(0),
});

export const detailedPhotoRequestSchema = z.looseObject({
  id: z.number(),
  description: z.string().catch(""),
  required: z.boolean().catch(true),
});

export const detailedQuestionRequestSchema = z.looseObject({
  id: z.number(),
  description: z.string().catch(""),
  required: z.boolean().catch(true),
  kind: z.string().catch("text"),
  data: z.unknown().nullish(),
});

export const detailedDocumentSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  description: z.string().catch(""),
  location: z.string().catch(""),
  file_type: z.string().catch(""),
});

export const detailedPlanSchema = listablePlanSchema.extend({
  stores: z.array(z.number()).catch([]),
  visits: z.array(detailedVisitSchema).catch([]),
  photo_requests: z.array(detailedPhotoRequestSchema).catch([]),
  question_requests: z.array(detailedQuestionRequestSchema).catch([]),
  documents: z.array(detailedDocumentSchema).catch([]),
});

export type DetailedPlan = z.infer<typeof detailedPlanSchema>;

export const listableStoreSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  store_no: z.union([z.string(), z.number()]).nullish(),
  avatar: z.string().nullish(),
  province: z.string().catch(""),
  num_user_priorities: z.number().catch(0),
  retailer: bareTitledSchema.nullish(),
});

export type ListableStore = z.infer<typeof listableStoreSchema>;

export type PlanReadinessLevel = "ready" | "warning" | "blocked";

export const readinessSummarySchema = z.looseObject({
  plan_id: z.number(),
  group: z.string().catch(""),
  status: z.string().catch(""),
  readiness: z.string().catch("warning"),
  expected_jobs: z.number().catch(0),
  coverage_pct: z.number().nullish(),
  warning_count: z.number().catch(0),
  can_allocate: z.boolean().catch(false),
});

export type PlanReadinessSummary = z.infer<typeof readinessSummarySchema>;

export const readinessDetailSchema = z.looseObject({
  plan_id: z.number(),
  readiness: z.string().catch("warning"),
  expected_jobs: z.number().catch(0),
  can_allocate: z.boolean().catch(false),
  cost: z.number().nullish(),
  hours: z.number().nullish(),
  warnings: z
    .array(
      z.looseObject({
        code: z.string().catch(""),
        severity: z.string().catch("medium"),
        message: z.string().catch(""),
      }),
    )
    .catch([]),
  unassigned_stores: z
    .array(
      z.looseObject({
        id: z.number().optional(),
        title: z.string().catch(""),
        store_no: z.union([z.string(), z.number()]).nullish(),
      }),
    )
    .catch([]),
});

export type PlanReadinessDetail = z.infer<typeof readinessDetailSchema>;

/** Form row shapes used by the plan editor. */
export interface PlanVisitFormRow {
  _id: number | null;
  opens_on: string;
  closes_on: string;
  hours: number;
  minutes: number;
}

export interface PlanPhotoFormRow {
  _id: number | null;
  description: string;
  required: boolean;
}

export interface PlanQuestionFormRow {
  _id: number | null;
  description: string;
  kind: QuestionRequestKind;
  required: boolean;
  data: string;
}

export interface PlanDocumentFormRow {
  _id: number | null;
  title: string;
  description: string;
  location: string;
  file: File | null;
  /** UI-only file accept filter (`media` | `pdf` | `excel`). */
  kind: "media" | "pdf" | "excel";
}

export interface PlanEditorFormValues {
  group: string;
  rate_type: PlanRateType;
  rate: number;
  is_survey: boolean;
  stores: number[];
  visits: PlanVisitFormRow[];
  photos: PlanPhotoFormRow[];
  questions: PlanQuestionFormRow[];
  documents: PlanDocumentFormRow[];
}

export const allocatePreviewSchema = z.looseObject({
  dry_run: z.literal(true),
  count_plans: z.number().catch(0),
  count_jobs: z.number().catch(0),
  assigned_jobs: z.number().catch(0),
  unassigned_jobs: z.number().catch(0),
  truncated: z.boolean().catch(false),
  preview_limit: z.number().catch(0),
  rep_workload: z
    .array(
      z.looseObject({
        user_id: z.number(),
        name: z.string().catch(""),
        rep_no: z.number().nullish(),
        jobs: z.number().catch(0),
      }),
    )
    .catch([]),
  jobs: z
    .array(
      z.looseObject({
        plan_id: z.number(),
        store: z.looseObject({
          id: z.number(),
          store_no: z.union([z.string(), z.number()]).catch(""),
          title: z.string().catch(""),
          retailer: z.string().catch(""),
        }),
        visit: z.looseObject({
          id: z.number(),
          opens_at: z.string().nullish(),
          closes_at: z.string().nullish(),
          planned_minutes: z.number().catch(0),
        }),
        assignee: z
          .looseObject({
            id: z.number(),
            name: z.string().catch(""),
            rep_no: z.number().nullish(),
          })
          .nullish(),
      }),
    )
    .catch([]),
});

export type AllocatePreview = z.infer<typeof allocatePreviewSchema>;

const storeRefSchema = z.looseObject({
  id: z.number(),
  store_no: z.union([z.string(), z.number()]).catch(""),
  title: z.string().catch(""),
  retailer: z.string().catch(""),
});

export const planStoreDiffSchema = z.looseObject({
  plan_id: z.number(),
  has_prior_cycle: z.boolean().catch(false),
  prior_cycle: bareTitledSchema.nullish(),
  has_prior_plan: z.boolean().catch(false),
  prior_plan_id: z.number().nullish(),
  unchanged_count: z.number().catch(0),
  prior_stores: z.array(storeRefSchema).catch([]),
  added_stores: z.array(storeRefSchema).catch([]),
  removed_stores: z.array(storeRefSchema).catch([]),
});

export type PlanStoreDiff = z.infer<typeof planStoreDiffSchema>;

const chartSliceSchema = z.looseObject({
  name: z.string().catch(""),
  value: z.number().catch(0),
});

export const plansChartSchema = z.looseObject({
  hours_data: z.array(chartSliceSchema).catch([]),
  budget_data: z.array(chartSliceSchema).catch([]),
  over_budget: z.boolean().catch(false),
});

export type PlansChart = z.infer<typeof plansChartSchema>;

export interface PlansChartRequest {
  cycle?: number;
  customer?: number;
  program?: number;
  plan?: number;
}

export interface CopyPlanOptions {
  cycleId: number;
  programId: number;
  group: string;
  copyStores: boolean;
  copyVisits: boolean;
  syncVisits: boolean;
  usePriorCycleStores: boolean;
  priorCycleStoreIds: number[];
  /** Target cycle start date (yyyy-MM-dd) for visit sync. */
  targetCycleStartsOn: string | null | undefined;
}

export interface PostablePlan {
  cycle: number;
  program: number;
  group: string;
  rate_type?: PlanRateType;
  rate?: number;
  is_survey?: boolean;
  stores?: number[];
  visits?: Array<number | { opens_at: string; closes_at: string; planned_minutes: number }>;
  photo_requests?: Array<number | { description: string; required: boolean }>;
  question_requests?: Array<
    number | { description: string; required: boolean; kind: string; data: unknown }
  >;
  documents?: number[];
}

export type PatchablePlan = Omit<PostablePlan, "cycle" | "program" | "group"> & {
  group?: string;
};
