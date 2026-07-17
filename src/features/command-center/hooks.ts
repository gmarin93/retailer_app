"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCurrentCycle, useCyclesByDate } from "@/shared/services/entities/cycles";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useActivePrograms } from "@/shared/services/entities/programs";
import {
  fetchCommandCenterKpis,
  fetchCommandCenterPendingByClient,
  fetchCommandCenterQueues,
  type CommandCenterScope,
} from "./api";

export const commandCenterKeys = {
  all: ["command-center"] as const,
  kpis: (scope: CommandCenterScope) => [...commandCenterKeys.all, "kpis", scope] as const,
  queues: (scope: CommandCenterScope) => [...commandCenterKeys.all, "queues", scope] as const,
  pending: (scope: CommandCenterScope) => [...commandCenterKeys.all, "pending", scope] as const,
};

export function useCommandCenter() {
  const cyclesQuery = useCyclesByDate();
  const customersQuery = useCustomersByTitle();

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);

  const cycles = cyclesQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  // Default cycle once cycles load (adjust during render — same pattern as review deep links).
  const defaultCycleId = getCurrentCycle(cycles)?.id ?? cycles[0]?.id ?? null;
  const effectiveCycleId = cycleId ?? defaultCycleId;

  const programsQuery = useActivePrograms(customerId, false, { enabled: true });
  const programs = programsQuery.data ?? [];

  const scope: CommandCenterScope | null =
    effectiveCycleId != null
      ? { cycleId: effectiveCycleId, customerId, programId }
      : null;

  const cycleTitle = cycles.find((c) => c.id === effectiveCycleId)?.title ?? "";

  const kpisQuery = useQuery({
    queryKey: scope ? commandCenterKeys.kpis(scope) : ["command-center", "kpis", "idle"],
    queryFn: ({ signal }) => fetchCommandCenterKpis(scope!, signal),
    enabled: scope != null,
    staleTime: 0,
  });

  const queuesQuery = useQuery({
    queryKey: scope ? commandCenterKeys.queues(scope) : ["command-center", "queues", "idle"],
    queryFn: ({ signal }) => fetchCommandCenterQueues(scope!, signal),
    enabled: scope != null,
    staleTime: 0,
  });

  const pendingQuery = useQuery({
    queryKey: scope ? commandCenterKeys.pending(scope) : ["command-center", "pending", "idle"],
    queryFn: ({ signal }) => fetchCommandCenterPendingByClient(scope!, signal),
    enabled: scope != null,
    staleTime: 0,
  });

  const setCustomer = (id: number | null) => {
    setCustomerId(id);
    setProgramId(null);
  };

  const refresh = () => {
    void kpisQuery.refetch();
    void queuesQuery.refetch();
    void pendingQuery.refetch();
  };

  return {
    cycles,
    customers,
    programs,
    cycleId: effectiveCycleId,
    setCycleId,
    customerId,
    setCustomer,
    programId,
    setProgramId,
    cycleTitle,
    scope,
    kpis: kpisQuery.data ?? null,
    queues: queuesQuery.data ?? [],
    pendingEntries: pendingQuery.data ?? [],
    isLoading:
      cyclesQuery.isLoading ||
      (scope != null &&
        (kpisQuery.isLoading || queuesQuery.isLoading || pendingQuery.isLoading)),
    isRefreshing: kpisQuery.isFetching || queuesQuery.isFetching || pendingQuery.isFetching,
    refresh,
  };
}
