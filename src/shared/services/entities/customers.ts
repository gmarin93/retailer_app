import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";

/** Reference entity: customers / clients (v2). */

export const listableCustomerSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  code: z.string().nullish(),
});

export type ListableCustomer = z.infer<typeof listableCustomerSchema>;

const customerPageSchema = resultsPageSchema(listableCustomerSchema);

export const customerKeys = {
  all: ["customers"] as const,
  listByTitle: () => [...customerKeys.all, "list", { order: "title" }] as const,
};

/** All customers ordered by title (Angular `getAllCustomersByTitle`). */
async function fetchAllCustomersByTitle(signal?: AbortSignal): Promise<ListableCustomer[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/customers/`, {
      searchParams: { _order: "title", _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return customerPageSchema.parse(data);
  });
}

export function useCustomersByTitle() {
  return useQuery({
    queryKey: customerKeys.listByTitle(),
    queryFn: ({ signal }) => fetchAllCustomersByTitle(signal),
    staleTime: 5 * 60_000,
  });
}

/** Assigned brands only (`customers/reviewable/`), ordered by title. */
async function fetchAllReviewableCustomersByTitle(
  signal?: AbortSignal,
): Promise<ListableCustomer[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/customers/reviewable/`, {
      searchParams: { _order: "title", _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return customerPageSchema.parse(data);
  });
}

export function useReviewableCustomersByTitle(enabled = true) {
  return useQuery({
    queryKey: [...customerKeys.all, "list", { order: "title", reviewable: true }],
    queryFn: ({ signal }) => fetchAllReviewableCustomersByTitle(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}
