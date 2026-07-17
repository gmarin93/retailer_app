import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api, apiPatchForm, apiPostForm, httpClient } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";
import {
  allocatePreviewSchema,
  detailedDocumentSchema,
  detailedPlanSchema,
  listablePlanSchema,
  listableStoreSchema,
  planStoreDiffSchema,
  plansChartSchema,
  readinessDetailSchema,
  readinessSummarySchema,
  type AllocatePreview,
  type DetailedPlan,
  type ListablePlan,
  type ListableStore,
  type PatchablePlan,
  type PlanDocumentFormRow,
  type PlanReadinessDetail,
  type PlanReadinessSummary,
  type PlansChart,
  type PlansChartRequest,
  type PlanStoreDiff,
  type PostablePlan,
} from "./schemas";
import { isRowDirty } from "./utils";

/**
 * Planning API — browse/readiness (v2) plus create/save (v1) and lifecycle
 * actions (v2). Editor write paths stay on v1 until the backend exposes v2
 * POST/PATCH (Angular still uses the same split).
 */

const v1 = `${env.apiHost}/v1`;
const v2 = `${env.apiHost}/v2`;

const planPageSchema = resultsPageSchema(listablePlanSchema);
const storePageSchema = resultsPageSchema(listableStoreSchema);
const readinessBulkSchema = z.object({ results: z.array(readinessSummarySchema) });
const countPlansSchema = z.looseObject({
  count_plans: z.number().catch(0),
  count_jobs: z.number().optional(),
});

export type {
  AllocatePreview,
  DetailedPlan,
  ListablePlan,
  ListableStore,
  PlanReadinessDetail,
  PlanReadinessSummary,
  PlansChart,
  PlanStoreDiff,
  PatchablePlan,
  PostablePlan,
};

/** Plans for a cycle + program, ordered by group (planner `loadListPlans`). */
export async function fetchPlans(
  cycleId: number,
  programId: number,
  signal?: AbortSignal,
): Promise<ListablePlan[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/plans/`, {
      searchParams: {
        cycle__id__in: cycleId,
        program__id__in: programId,
        _order: "group",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return planPageSchema.parse(data);
  });
}

/** Single plan (listable or detailed — both parse as listable). */
export async function fetchPlan(
  id: number,
  signal?: AbortSignal,
): Promise<ListablePlan> {
  const data = await api.get<unknown>(`${v2}/plans/${id}/`, { signal });
  return listablePlanSchema.parse(data);
}

/** Full plan with nested visits / photo / question / document rows. */
export async function fetchDetailedPlan(
  id: number,
  signal?: AbortSignal,
): Promise<DetailedPlan> {
  const data = await api.get<unknown>(`${v2}/plans/${id}/`, { signal });
  return detailedPlanSchema.parse(data);
}

/** Active stores for a program's retailer (planner `loadListStores`). */
export async function fetchStoresForRetailer(
  retailerId: number,
  signal?: AbortSignal,
): Promise<ListableStore[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/stores/`, {
      searchParams: {
        active: "True",
        retailer__id__in: retailerId,
        _order: "store_no",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return storePageSchema.parse(data);
  });
}

/** Bulk readiness for every plan in a cycle + program. */
export async function fetchPlansReadiness(
  cycleId: number,
  programId: number,
  signal?: AbortSignal,
): Promise<Map<number, PlanReadinessSummary>> {
  try {
    const data = await api.get<unknown>(`${v2}/plans/readiness/`, {
      searchParams: { cycle: cycleId, program: programId },
      signal,
    });
    const parsed = readinessBulkSchema.parse(data);
    return new Map(parsed.results.map((summary) => [summary.plan_id, summary]));
  } catch {
    return new Map();
  }
}

/** Full readiness detail (warnings list) for one plan. */
export async function fetchPlanReadiness(
  planId: number,
  signal?: AbortSignal,
): Promise<PlanReadinessDetail | null> {
  try {
    const data = await api.get<unknown>(`${v2}/plans/${planId}/readiness/`, { signal });
    return readinessDetailSchema.parse(data);
  } catch {
    return null;
  }
}

/** Create a plan group (`POST /v1/plans/`). */
export async function createPlan(payload: PostablePlan): Promise<ListablePlan> {
  const data = await api.post<unknown>(`${v1}/plans/`, payload);
  return listablePlanSchema.parse(data);
}

/** Save dirty plan fields (`PATCH /v1/plans/{id}/`). */
export async function patchPlan(
  planId: number,
  payload: PatchablePlan,
): Promise<ListablePlan> {
  const data = await api.patch<unknown>(`${v1}/plans/${planId}/`, payload);
  return listablePlanSchema.parse(data);
}

export async function deletePlan(planId: number): Promise<void> {
  await api.delete(`${v2}/plans/${planId}/`);
}

export async function completePlans(planIds: number[]): Promise<number> {
  const data = await api.post<unknown>(`${v2}/plans/complete/`, { plans: planIds });
  return countPlansSchema.parse(data).count_plans;
}

export async function verifyPlans(planIds: number[]): Promise<number> {
  const data = await api.post<unknown>(`${v2}/plans/verify/`, { plans: planIds });
  return countPlansSchema.parse(data).count_plans;
}

export async function unverifyPlans(planIds: number[]): Promise<number> {
  const data = await api.post<unknown>(`${v2}/plans/unverify/`, { plans: planIds });
  return countPlansSchema.parse(data).count_plans;
}

/** Dispatch jobs from a verified plan (`POST /v2/plans/allocate/`). */
export async function allocatePlans(
  planIds: number[],
): Promise<{ count_plans: number; count_jobs: number }> {
  const data = await api.post<unknown>(`${v2}/plans/allocate/`, { plans: planIds });
  const parsed = countPlansSchema.parse(data);
  return {
    count_plans: parsed.count_plans,
    count_jobs: parsed.count_jobs ?? 0,
  };
}

/** Dry-run allocate preview (`POST /v2/plans/allocate/?dry_run=true`). */
export async function previewAllocatePlans(planIds: number[]): Promise<AllocatePreview> {
  const data = await httpClient
    .post(`${v2}/plans/allocate/`, {
      json: { plans: planIds },
      searchParams: { dry_run: "true" },
    })
    .json<unknown>();
  return allocatePreviewSchema.parse(data);
}

/** Store list diff vs prior cycle (`GET /v2/plans/store_diff/`). */
export async function fetchPlanStoreDiff(
  planId: number,
  targetCycleId: number,
  signal?: AbortSignal,
): Promise<PlanStoreDiff> {
  const data = await api.get<unknown>(`${v2}/plans/store_diff/`, {
    searchParams: { plan: planId, target_cycle: targetCycleId },
    signal,
  });
  return planStoreDiffSchema.parse(data);
}

/** Hours / budget pie data (`POST /v2/plans/chart/`). */
export async function fetchPlansChart(
  body: PlansChartRequest,
  signal?: AbortSignal,
): Promise<PlansChart> {
  const data = await api.post<unknown>(`${v2}/plans/chart/`, body, { signal });
  return plansChartSchema.parse(data);
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = /filename="?([^"]+)"?/i.exec(header);
  return plainMatch?.[1] ?? null;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Download planning summary report blob (`GET /v2/plans/summary_report/`). */
export async function downloadPlansSummaryReport(args: {
  cycleId: number;
  customerId: number;
  programIds?: number[];
}): Promise<void> {
  const response = await httpClient.get(`${v2}/plans/summary_report/`, {
    searchParams: {
      cycle__id__in: String(args.cycleId),
      program__customer__id__in: String(args.customerId),
      ...(args.programIds?.length
        ? { program__id__in: args.programIds.join(",") }
        : {}),
    },
  });
  const blob = await response.blob();
  const filename =
    filenameFromDisposition(response.headers.get("Content-Disposition")) ??
    "plans-summary-report.xlsx";
  saveBlob(blob, filename);
}

const uploadedDocumentSchema = detailedDocumentSchema;

/** Multipart document create (`POST /v2/documents/`). */
export async function postDocument(args: {
  title: string;
  description?: string;
  file: File;
}): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append("title", args.title || args.file.name.replace(/\.[^/.]+$/, ""));
  if (args.description) formData.append("description", args.description);
  formData.append("location", args.file);
  const data = await apiPostForm<unknown>(`${v2}/documents/`, formData);
  return uploadedDocumentSchema.parse(data);
}

/** Patch document metadata (`PATCH /v2/documents/{id}/`). */
export async function patchDocumentMeta(
  id: number,
  args: { title: string; description?: string },
): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append("title", args.title);
  if (args.description != null) formData.append("description", args.description);
  const data = await apiPatchForm<unknown>(`${v2}/documents/${id}/`, formData);
  return uploadedDocumentSchema.parse(data);
}

/**
 * Resolve document form rows to IDs (upload new files / patch meta), mirroring
 * Angular `doPlanSave` document handling. Unchanged rows keep their IDs.
 */
/** Set customer cycle budget (`POST /v2/customers/reviewable/{id}/set_cycle_budget/`). */
export async function setCustomerCycleBudget(args: {
  customerId: number;
  cycleId: number;
  budget: number;
}): Promise<{ budget: number }> {
  const data = await api.post<unknown>(
    `${v2}/customers/reviewable/${args.customerId}/set_cycle_budget/`,
    { cycle: args.cycleId, budget: args.budget },
  );
  return z.looseObject({ budget: z.number().catch(0) }).parse(data);
}

export async function resolveDocumentIds(
  documents: PlanDocumentFormRow[],
  documentDirties: unknown,
): Promise<number[]> {
  const ids: number[] = [];
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index]!;
    const rowDirty = isRowDirty(documentDirties, index);
    if (document._id && !rowDirty) {
      ids.push(document._id);
      continue;
    }
    if (document.file) {
      const posted = await postDocument({
        title: document.title || document.file.name.replace(/\.[^/.]+$/, ""),
        description: document.description,
        file: document.file,
      });
      ids.push(posted.id);
      continue;
    }
    if (document._id) {
      const patched = await patchDocumentMeta(document._id, {
        title: document.title,
        description: document.description,
      });
      ids.push(patched.id);
    }
  }
  return ids;
}
