import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import { fetchAllJobs, fetchJobs, fetchJobsCount } from "@/features/jobs/api";
import type { ListableJob } from "@/features/jobs/schemas";
import {
  pendingByClientResponseSchema,
  type PendingByClientEntry,
} from "./schemas";
import { aggregatePendingByCustomer } from "./utils";

export interface CommandCenterScope {
  cycleId: number;
  customerId: number | null;
  programId: number | null;
}

export interface CommandCenterKpis {
  total: number;
  completed: number;
  pending: number;
  open: number;
  overdue: number;
  unassigned: number;
  completion: number;
}

export interface ActionQueue {
  id: "review" | "overdue" | "unassigned";
  title: string;
  hint: string;
  accent: "amber" | "red" | "violet";
  count: number;
  results: ListableJob[];
}

const QUEUE_PREVIEW_LIMIT = 6;
const v2 = `${env.apiHost}/v2`;

function scopeFilters(scope: CommandCenterScope) {
  return {
    cycles: [scope.cycleId],
    customers: scope.customerId != null ? [scope.customerId] : undefined,
    programs: scope.programId != null ? [scope.programId] : undefined,
  };
}

export async function fetchCommandCenterKpis(
  scope: CommandCenterScope,
  signal?: AbortSignal,
): Promise<CommandCenterKpis> {
  const base = scopeFilters(scope);
  const [total, completed, pending, open, overdue, unassigned] = await Promise.all([
    fetchJobsCount({ view: "default", ...base }, signal),
    fetchJobsCount(
      { view: "default", ...base, statuses: ["completed", "invoiced"] },
      signal,
    ),
    fetchJobsCount({ view: "default", ...base, statuses: ["pending"] }, signal),
    fetchJobsCount({ view: "default", ...base, statuses: ["open"] }, signal),
    fetchJobsCount({ view: "default", ...base, overdue: true }, signal),
    fetchJobsCount({ view: "default", ...base, unassigned: true }, signal),
  ]);
  return {
    total,
    completed,
    pending,
    open,
    overdue,
    unassigned,
    completion: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

async function fetchQueuePage(
  scope: CommandCenterScope,
  extra: { statuses?: string[]; overdue?: boolean; unassigned?: boolean },
  signal?: AbortSignal,
): Promise<{ count: number; results: ListableJob[] }> {
  try {
    const page = await fetchJobs(
      {
        view: "default",
        page: 0,
        pageSize: QUEUE_PREVIEW_LIMIT,
        order: [],
        ...scopeFilters(scope),
        ...extra,
      },
      signal,
    );
    return { count: page.count, results: page.results.slice(0, QUEUE_PREVIEW_LIMIT) };
  } catch {
    return { count: 0, results: [] };
  }
}

export async function fetchCommandCenterQueues(
  scope: CommandCenterScope,
  signal?: AbortSignal,
): Promise<ActionQueue[]> {
  const [review, overdue, unassigned] = await Promise.all([
    fetchQueuePage(scope, { statuses: ["pending"] }, signal),
    fetchQueuePage(scope, { overdue: true }, signal),
    fetchQueuePage(scope, { unassigned: true }, signal),
  ]);
  return [
    {
      id: "review",
      title: "Needs review",
      hint: "Submitted visits awaiting your sign-off",
      accent: "amber",
      count: review.count,
      results: review.results,
    },
    {
      id: "overdue",
      title: "Overdue visits",
      hint: "Open visits past their close date",
      accent: "red",
      count: overdue.count,
      results: overdue.results,
    },
    {
      id: "unassigned",
      title: "Unassigned",
      hint: "Visits with no rep allocated yet",
      accent: "violet",
      count: unassigned.count,
      results: unassigned.results,
    },
  ];
}

/**
 * Pending-by-client: aggregated endpoint when cycle-only; otherwise (or on
 * failure) aggregate from reviewable jobs with the active scope.
 */
export async function fetchCommandCenterPendingByClient(
  scope: CommandCenterScope,
  signal?: AbortSignal,
): Promise<PendingByClientEntry[]> {
  const scoped = scope.customerId != null || scope.programId != null;
  if (!scoped) {
    try {
      const data = await api.get<unknown>(`${v2}/dashboard/pending_reviews_by_customers/`, {
        searchParams: { cycle: scope.cycleId },
        signal,
      });
      const parsed = pendingByClientResponseSchema.parse(data);
      if (parsed.entries.length > 0) return parsed.entries;
    } catch {
      // Fall through to job aggregation.
    }
  }

  const jobs = await fetchAllJobs(
    {
      view: "reviewable",
      order: [],
      statuses: ["pending"],
      ...scopeFilters(scope),
    },
    signal,
  );
  return aggregatePendingByCustomer(jobs);
}
