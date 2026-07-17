import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";
import {
  customerVisitMatchSchema,
  listableUserSchema,
  RESOURCE_BY_LEVEL,
  type AccessLevel,
  type CustomerVisitMatch,
  type ListableUser,
} from "./schemas";
import { z } from "zod";

const v2 = `${env.apiHost}/v2`;
const matchListSchema = z.array(customerVisitMatchSchema);
const userPageSchema = resultsPageSchema(listableUserSchema);

export async function grantCustomerVisitAccess(
  level: AccessLevel,
  userId: number,
  customerId: number,
): Promise<unknown> {
  return api.post<unknown>(`${v2}/${RESOURCE_BY_LEVEL[level]}/`, {
    id: userId,
    customer: customerId,
    user: userId,
  });
}

export async function fetchCustomerVisitMatches(
  level: AccessLevel,
  userId: number,
  signal?: AbortSignal,
): Promise<CustomerVisitMatch[]> {
  const data = await api.get<unknown>(
    `${v2}/${RESOURCE_BY_LEVEL[level]}/filter_by_user/`,
    {
      searchParams: { user_id: userId },
      signal,
    },
  );
  return matchListSchema.parse(data);
}

export async function revokeCustomerVisitAccess(
  level: AccessLevel,
  matchId: number,
): Promise<unknown> {
  return api.delete<unknown>(`${v2}/${RESOURCE_BY_LEVEL[level]}/delete_match/`, {
    searchParams: { id: matchId },
  });
}

/** All users (Angular loads the full catalog for the autocomplete). */
export async function fetchAllUsers(signal?: AbortSignal): Promise<ListableUser[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/users/`, {
      searchParams: {
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return userPageSchema.parse(data);
  });
}
