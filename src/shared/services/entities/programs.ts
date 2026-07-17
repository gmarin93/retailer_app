import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";

/** Reference entity: programs (v2). */

export const listableProgramSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  customer: z.looseObject({ id: z.number(), title: z.string().catch("") }).nullish(),
  retailer: z.looseObject({ id: z.number(), title: z.string().catch("") }).nullish(),
});

export type ListableProgram = z.infer<typeof listableProgramSchema>;

const programPageSchema = resultsPageSchema(listableProgramSchema);

export interface ActiveProgramsQuery {
  customers?: number[];
  retailers?: number[];
  reviewable?: boolean;
}

export const programKeys = {
  all: ["programs"] as const,
  activeForCustomer: (customerId: number | null, reviewable: boolean) =>
    [...programKeys.all, "active", { customerId, reviewable }] as const,
  activeFiltered: (query: ActiveProgramsQuery) =>
    [...programKeys.all, "active-filtered", query] as const,
};

/**
 * Active programs, optionally scoped to a customer.
 * When `customerId` is null, returns all active programs (Command Center).
 */
async function fetchActivePrograms(
  customerId: number | null,
  reviewable: boolean,
  signal?: AbortSignal,
): Promise<ListableProgram[]> {
  const route = reviewable ? "programs/reviewable" : "programs";
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/${route}/`, {
      searchParams: {
        active: "True",
        customer__id__in: customerId ?? undefined,
        _order: "title",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return programPageSchema.parse(data);
  });
}

/**
 * Active programs for a customer. When `customerId` is null and `enabled` is
 * true (Command Center), returns all active programs.
 */
export function useActivePrograms(
  customerId: number | null,
  reviewable = false,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: programKeys.activeForCustomer(customerId, reviewable),
    queryFn: ({ signal }) => fetchActivePrograms(customerId, reviewable, signal),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? customerId !== null,
  });
}

/**
 * Active programs scoped by customers and/or retailers (jobs filter panel).
 * Short-circuits to [] unless at least one scope id is provided.
 */
async function fetchActiveProgramsFiltered(
  query: ActiveProgramsQuery,
  signal?: AbortSignal,
): Promise<ListableProgram[]> {
  const route = query.reviewable ? "programs/reviewable" : "programs";
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/${route}/`, {
      searchParams: {
        active: "True",
        customer__id__in: query.customers?.length ? query.customers.join(",") : undefined,
        retailer__id__in: query.retailers?.length ? query.retailers.join(",") : undefined,
        _order: "title",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return programPageSchema.parse(data);
  });
}

export function useActiveProgramsFiltered(query: ActiveProgramsQuery, enabled = true) {
  const hasScope = (query.customers?.length ?? 0) > 0 || (query.retailers?.length ?? 0) > 0;
  return useQuery({
    queryKey: programKeys.activeFiltered(query),
    queryFn: ({ signal }) => fetchActiveProgramsFiltered(query, signal),
    staleTime: 5 * 60_000,
    enabled: enabled && hasScope,
  });
}
