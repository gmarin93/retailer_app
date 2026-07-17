"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchAllJobs, publishJobs, reassignJobs } from "@/features/jobs/api";
import { useCyclesByDate } from "@/shared/services/entities/cycles";
import { fetchItineraryReport, type ItineraryReportQuery } from "./api";
import type { UserItinerary } from "./schemas";

export const operationsKeys = {
  all: ["operations"] as const,
  report: (q: ItineraryReportQuery) => [...operationsKeys.all, "report", q] as const,
  userJobs: (userId: number, cycleId: number, province: string | null) =>
    [...operationsKeys.all, "user-jobs", { userId, cycleId, province }] as const,
};

export function useOperations() {
  const cyclesQuery = useCyclesByDate();
  const queryClient = useQueryClient();
  const cycles = cyclesQuery.data ?? [];

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [reps, setReps] = useState("");
  const [searched, setSearched] = useState<ItineraryReportQuery | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [viewing, setViewing] = useState<UserItinerary | null>(null);

  const effectiveCycleId = cycleId ?? cycles[0]?.id ?? null;

  const reportQuery = useQuery({
    queryKey: searched ? operationsKeys.report(searched) : ["operations", "report", "idle"],
    queryFn: ({ signal }) => fetchItineraryReport(searched!, signal),
    enabled: searched != null,
    staleTime: 0,
  });

  const itineraries = useMemo(() => {
    if (!reportQuery.data) return null;
    return reportQuery.data.per_user;
  }, [reportQuery.data]);

  const publishable = useMemo(
    () => (itineraries ?? []).filter((row) => row.count_planned > 0),
    [itineraries],
  );

  const search = () => {
    if (effectiveCycleId == null) {
      toast.error("Select a cycle first");
      return;
    }
    setViewing(null);
    setSelectionMode(false);
    setSelectedUserIds(new Set());
    setSearched({
      cycle: effectiveCycleId,
      province,
      reps: reps.trim() || null,
    });
  };

  const publishMutation = useMutation({
    mutationFn: () =>
      publishJobs({
        cycle: searched!.cycle,
        users: [...selectedUserIds],
      }),
    onSuccess: async (result) => {
      toast.success(
        `Successfully published ${result.num_jobs} visits for ${result.num_users} users.`,
      );
      setSelectedUserIds(new Set());
      setSelectionMode(false);
      await queryClient.invalidateQueries({ queryKey: operationsKeys.all });
    },
    onError: async () => {
      toast.error("Failed to publish visits.");
      await queryClient.invalidateQueries({ queryKey: operationsKeys.all });
    },
  });

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllPublishable = () => {
    if (selectedUserIds.size === publishable.length) {
      setSelectedUserIds(new Set());
      return;
    }
    setSelectedUserIds(new Set(publishable.map((row) => row.user.id)));
  };

  const aggregates = useMemo(() => {
    const rows = itineraries ?? [];
    const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
    const totalPlannedVisits = rows.reduce((sum, row) => sum + row.count_planned, 0);
    const repsToPublish = rows.filter((row) => row.count_planned > 0).length;
    return {
      repCount: rows.length,
      totalHours: totalMinutes / 60,
      totalPlannedVisits,
      repsToPublish,
      repsFullyPublished: rows.length - repsToPublish,
    };
  }, [itineraries]);

  return {
    cycles,
    cycleId: effectiveCycleId,
    setCycleId,
    province,
    setProvince,
    reps,
    setReps,
    search,
    searched,
    itineraries,
    isLoading: reportQuery.isLoading || reportQuery.isFetching,
    reportError: reportQuery.isError ? reportQuery.error : null,
    aggregates,
    selectionMode,
    setSelectionMode: (on: boolean) => {
      setSelectionMode(on);
      if (!on) setSelectedUserIds(new Set());
    },
    selectedUserIds,
    toggleUser,
    toggleAllPublishable,
    publishableCount: publishable.length,
    publish: () => {
      if (!searched || selectedUserIds.size === 0) return;
      publishMutation.mutate();
    },
    isPublishing: publishMutation.isPending,
    viewing,
    openDetail: (row: UserItinerary) => setViewing(row),
    closeDetail: () => setViewing(null),
  };
}

export function useUserItineraryJobs(
  userId: number | null,
  cycleId: number | null,
  province: string | null,
) {
  return useQuery({
    queryKey:
      userId != null && cycleId != null
        ? operationsKeys.userJobs(userId, cycleId, province)
        : ["operations", "user-jobs", "idle"],
    queryFn: ({ signal }) =>
      fetchAllJobs(
        {
          order: [],
          assignees: [userId!],
          cycles: [cycleId!],
          provinces: province ? [province] : undefined,
        },
        signal,
      ),
    enabled: userId != null && cycleId != null,
    staleTime: 0,
  });
}

export function useReassignUserJobs(onDone: () => void) {
  return useMutation({
    mutationFn: (payload: { jobs: number[]; users: number[] }) => reassignJobs(payload),
    onSuccess: () => {
      toast.success("Successfully reassigned visits");
      onDone();
    },
    onError: () => toast.error("Failed to reassign visits"),
  });
}
