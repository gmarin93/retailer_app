import { z } from "zod";

/**
 * DRF paginated response shape used by the v2 list endpoints.
 * Query params (ported from the Angular `ModelFilter`): `_page` (1-based),
 * `_page_size`, `_order`, `_search`.
 */
export function resultsPageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  });
}

export interface ResultsPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Page size used when exhaustively paginating a list endpoint. */
export const FETCH_ALL_PAGE_SIZE = 200;

/**
 * Fetches every page of a paginated endpoint (mirrors `_getAllFiltered` in the
 * Angular API base service). `fetchPage` receives the 1-based page number.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<ResultsPage<T>>,
): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const results = [...firstPage.results];
  let next = firstPage.next;
  let page = 1;
  while (next) {
    page += 1;
    const nextPage = await fetchPage(page);
    results.push(...nextPage.results);
    next = nextPage.next;
  }
  return results;
}
