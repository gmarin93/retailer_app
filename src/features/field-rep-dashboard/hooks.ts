"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchActiveAnnouncements,
  fetchFieldRepVisitCounts,
  fetchRepContacts,
  markAnnouncementRead,
} from "./api";

export const fieldRepKeys = {
  all: ["field-rep-dashboard"] as const,
  announcements: () => [...fieldRepKeys.all, "announcements"] as const,
  visitCounts: () => [...fieldRepKeys.all, "visit-counts"] as const,
  contacts: () => [...fieldRepKeys.all, "contacts"] as const,
};

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: fieldRepKeys.announcements(),
    queryFn: ({ signal }) => fetchActiveAnnouncements(signal),
    staleTime: 5 * 60_000,
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAnnouncementRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: fieldRepKeys.announcements() });
      const previous = queryClient.getQueryData(fieldRepKeys.announcements());
      queryClient.setQueryData(
        fieldRepKeys.announcements(),
        (old: Awaited<ReturnType<typeof fetchActiveAnnouncements>> | undefined) =>
          old?.map((a) => (a.id === id ? { ...a, is_read: true } : a)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(fieldRepKeys.announcements(), ctx.previous);
      }
    },
  });
}

export function useFieldRepVisitCounts() {
  return useQuery({
    queryKey: fieldRepKeys.visitCounts(),
    queryFn: ({ signal }) => fetchFieldRepVisitCounts(signal),
    staleTime: 60_000,
  });
}

export function useRepContacts() {
  return useQuery({
    queryKey: fieldRepKeys.contacts(),
    queryFn: ({ signal }) => fetchRepContacts(signal),
    staleTime: 10 * 60_000,
  });
}
