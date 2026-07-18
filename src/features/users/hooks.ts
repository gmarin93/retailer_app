"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDetailedUser } from "./api";

export const userKeys = {
  all: ["users"] as const,
  detail: (id: number) => [...userKeys.all, "detail", id] as const,
};

export function useDetailedUser(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: id != null ? userKeys.detail(id) : ["users", "detail", "idle"],
    queryFn: ({ signal }) => fetchDetailedUser(id!, signal),
    enabled: enabled && id != null,
    staleTime: 5 * 60_000,
  });
}
