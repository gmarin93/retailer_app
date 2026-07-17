import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";

/** Reference entity: retailers (v2). */

export const listableRetailerSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  code: z.string().nullish(),
});

export type ListableRetailer = z.infer<typeof listableRetailerSchema>;

const retailerPageSchema = resultsPageSchema(listableRetailerSchema);

export const retailerKeys = {
  all: ["retailers"] as const,
  listByTitle: () => [...retailerKeys.all, "list", { order: "title" }] as const,
};

/** All retailers ordered by title (Angular `getAllRetailersByTitle`). */
async function fetchAllRetailersByTitle(signal?: AbortSignal): Promise<ListableRetailer[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/retailers/`, {
      searchParams: { _order: "title", _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return retailerPageSchema.parse(data);
  });
}

export function useRetailersByTitle(enabled = true) {
  return useQuery({
    queryKey: retailerKeys.listByTitle(),
    queryFn: ({ signal }) => fetchAllRetailersByTitle(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}
