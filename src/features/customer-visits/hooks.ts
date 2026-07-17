"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import { useReviewableCustomersByTitle } from "@/shared/services/entities/customers";
import {
  fetchAllUsers,
  fetchCustomerVisitMatches,
  grantCustomerVisitAccess,
  revokeCustomerVisitAccess,
} from "./api";
import type { AccessLevel, CustomerVisitRow, ListableUser } from "./schemas";

export const customerVisitsKeys = {
  all: ["customer-visits"] as const,
  users: () => [...customerVisitsKeys.all, "users"] as const,
  matches: (level: AccessLevel, userId: number) =>
    [...customerVisitsKeys.all, "matches", level, userId] as const,
};

export function useCustomerVisitsUsers() {
  return useQuery({
    queryKey: customerVisitsKeys.users(),
    queryFn: ({ signal }) => fetchAllUsers(signal),
    staleTime: 5 * 60_000,
  });
}

export function useCustomerVisitsCustomers() {
  return useReviewableCustomersByTitle(true);
}

export function useCustomerVisitMatches(
  level: AccessLevel | null,
  userId: number | null,
  enabled: boolean,
) {
  const customers = useCustomerVisitsCustomers();

  const catalog = customers.data ?? [];

  return useQuery({
    queryKey:
      level && userId != null
        ? [...customerVisitsKeys.matches(level, userId), catalog.map((c) => c.id)]
        : ["customer-visits", "matches", "idle"],
    queryFn: async ({ signal }) => {
      const matches = await fetchCustomerVisitMatches(level!, userId!, signal);
      const rows: CustomerVisitRow[] = [];
      for (const match of matches) {
        const customerId = Number(match.customer);
        const matchId = Number(match.id);
        if (!Number.isFinite(customerId) || !Number.isFinite(matchId)) continue;
        const customer = catalog.find((c) => c.id === customerId);
        if (!customer) continue;
        rows.push({ id: matchId, customerTitle: customer.title });
      }
      return rows;
    },
    enabled: enabled && level != null && userId != null && customers.isSuccess,
    staleTime: 0,
  });
}

export function useGrantCustomerVisitAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { level: AccessLevel; userId: number; customerId: number }) =>
      grantCustomerVisitAccess(args.level, args.userId, args.customerId),
    onSuccess: (_data, args) => {
      toast.success("Access granted");
      void queryClient.invalidateQueries({
        queryKey: customerVisitsKeys.matches(args.level, args.userId),
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to grant access");
    },
  });
}

export function useRevokeCustomerVisitAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { level: AccessLevel; matchId: number; userId: number }) =>
      revokeCustomerVisitAccess(args.level, args.matchId),
    onSuccess: (_data, args) => {
      toast.success("Access removed");
      void queryClient.invalidateQueries({
        queryKey: customerVisitsKeys.matches(args.level, args.userId),
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove access");
    },
  });
}

export function filterUsers(users: ListableUser[], query: string): ListableUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, 20);
  return users
    .filter((user) => {
      const haystack = [
        user.username,
        user.first_name,
        user.last_name,
        user.rep_no != null ? String(user.rep_no) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 20);
}

export function formatUserLabel(user: ListableUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const rep = user.rep_no != null ? ` #${user.rep_no}` : "";
  return name ? `${name}${rep} (@${user.username})` : `@${user.username}${rep}`;
}
