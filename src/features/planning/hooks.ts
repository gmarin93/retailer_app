import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import {
  allocatePlans,
  completePlans,
  createPlan,
  deletePlan,
  downloadPlansSummaryReport,
  fetchDetailedPlan,
  fetchPlanReadiness,
  fetchPlans,
  fetchPlansChart,
  fetchPlansReadiness,
  fetchPlanStoreDiff,
  fetchStoresForRetailer,
  patchPlan,
  previewAllocatePlans,
  resolveDocumentIds,
  setCustomerCycleBudget,
  unverifyPlans,
  verifyPlans,
  type PatchablePlan,
  type PostablePlan,
} from "./api";
import type { PlanEditorFormValues, PlansChartRequest } from "./schemas";
import { buildPatchablePlan } from "./utils";

export const planningKeys = {
  all: ["planning"] as const,
  plans: (cycleId: number | null, programId: number | null) =>
    [...planningKeys.all, "plans", { cycleId, programId }] as const,
  readiness: (cycleId: number | null, programId: number | null) =>
    [...planningKeys.all, "readiness", { cycleId, programId }] as const,
  planReadiness: (planId: number | null) =>
    [...planningKeys.all, "plan-readiness", planId] as const,
  detailed: (planId: number | null) => [...planningKeys.all, "detailed", planId] as const,
  stores: (retailerId: number | null) => [...planningKeys.all, "stores", retailerId] as const,
  storeDiff: (planId: number | null, cycleId: number | null) =>
    [...planningKeys.all, "store-diff", { planId, cycleId }] as const,
  chart: (scope: PlansChartRequest) => [...planningKeys.all, "chart", scope] as const,
};

function invalidatePlanQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  cycleId: number | null,
  programId: number | null,
  planId?: number | null,
) {
  void queryClient.invalidateQueries({
    queryKey: planningKeys.plans(cycleId, programId),
  });
  void queryClient.invalidateQueries({
    queryKey: planningKeys.readiness(cycleId, programId),
  });
  if (planId != null) {
    void queryClient.invalidateQueries({
      queryKey: planningKeys.detailed(planId),
    });
    void queryClient.invalidateQueries({
      queryKey: planningKeys.planReadiness(planId),
    });
  } else {
    void queryClient.invalidateQueries({
      queryKey: [...planningKeys.all, "detailed"],
    });
    void queryClient.invalidateQueries({
      queryKey: [...planningKeys.all, "plan-readiness"],
    });
  }
}

export function usePlans(cycleId: number | null, programId: number | null) {
  return useQuery({
    queryKey: planningKeys.plans(cycleId, programId),
    queryFn: ({ signal }) => fetchPlans(cycleId!, programId!, signal),
    enabled: cycleId !== null && programId !== null,
  });
}

export function usePlansReadiness(cycleId: number | null, programId: number | null) {
  return useQuery({
    queryKey: planningKeys.readiness(cycleId, programId),
    queryFn: ({ signal }) => fetchPlansReadiness(cycleId!, programId!, signal),
    enabled: cycleId !== null && programId !== null,
  });
}

export function useDetailedPlan(planId: number | null) {
  return useQuery({
    queryKey: planningKeys.detailed(planId),
    queryFn: ({ signal }) => fetchDetailedPlan(planId!, signal),
    enabled: planId !== null,
  });
}

export function usePlanReadiness(planId: number | null) {
  return useQuery({
    queryKey: planningKeys.planReadiness(planId),
    queryFn: ({ signal }) => fetchPlanReadiness(planId!, signal),
    enabled: planId !== null,
  });
}

export function useStoresForRetailer(retailerId: number | null) {
  return useQuery({
    queryKey: planningKeys.stores(retailerId),
    queryFn: ({ signal }) => fetchStoresForRetailer(retailerId!, signal),
    enabled: retailerId !== null,
    staleTime: 5 * 60_000,
  });
}

export function useCreatePlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostablePlan) => createPlan(payload),
    onSuccess: (plan) => {
      toast.success("Successfully created new plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, plan.id);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Failed to create new plan."),
  });
}

export function usePatchPlan(
  cycleId: number | null,
  programId: number | null,
  planId: number | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      values: PlanEditorFormValues;
      dirtyFields: Partial<Record<keyof PlanEditorFormValues, unknown>>;
    }) => {
      const patch: PatchablePlan = buildPatchablePlan(args.values, args.dirtyFields);
      if (args.dirtyFields.documents) {
        patch.documents = await resolveDocumentIds(
          args.values.documents,
          args.dirtyFields.documents,
        );
      }
      if (Object.keys(patch).length === 0) return null;
      return patchPlan(planId!, patch);
    },
    onSuccess: (result) => {
      if (!result) return;
      toast.success("Successfully saved plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, planId);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Failed to save plan."),
  });
}

export function useDeletePlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => deletePlan(planId),
    onSuccess: () => {
      toast.success("Successfully deleted plan.");
      invalidatePlanQueries(queryClient, cycleId, programId);
    },
    onError: () => toast.error("Failed to delete plan."),
  });
}

export function useCompletePlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => completePlans([planId]),
    onSuccess: (_count, planId) => {
      toast.success("Successfully completed plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, planId);
    },
    onError: () => toast.error("Failed to complete plan."),
  });
}

export function useVerifyPlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => verifyPlans([planId]),
    onSuccess: (_count, planId) => {
      toast.success("Successfully verified plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, planId);
    },
    onError: () => toast.error("Failed to verify plan."),
  });
}

export function useUnverifyPlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => unverifyPlans([planId]),
    onSuccess: (_count, planId) => {
      toast.success("Successfully unverified plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, planId);
    },
    onError: () => toast.error("Failed to unverify plan."),
  });
}

export function useAllocatePlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => allocatePlans([planId]),
    onSuccess: (result, planId) => {
      toast.success(
        result.count_jobs > 0
          ? `Successfully allocated plan into ${result.count_jobs} visits.`
          : "Successfully allocated plan.",
      );
      invalidatePlanQueries(queryClient, cycleId, programId, planId);
    },
    onError: () => toast.error("Failed to allocate plan."),
  });
}

export function usePreviewAllocate() {
  return useMutation({
    mutationFn: (planId: number) => previewAllocatePlans([planId]),
    onError: () => toast.error("Failed to build dispatch preview."),
  });
}
export function useCopyPlan(cycleId: number | null, programId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostablePlan) => createPlan(payload),
    onSuccess: (plan) => {
      toast.success("Successfully copied plan.");
      invalidatePlanQueries(queryClient, cycleId, programId, plan.id);
      // Also invalidate the destination scope if different.
      void queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Failed to copy plan."),
  });
}

export function usePlanStoreDiff(planId: number | null, targetCycleId: number | null) {
  return useQuery({
    queryKey: planningKeys.storeDiff(planId, targetCycleId),
    queryFn: ({ signal }) => fetchPlanStoreDiff(planId!, targetCycleId!, signal),
    enabled: planId !== null && targetCycleId !== null,
  });
}

export function usePlansChart(scope: PlansChartRequest | null) {
  return useQuery({
    queryKey: planningKeys.chart(scope ?? {}),
    queryFn: ({ signal }) => fetchPlansChart(scope!, signal),
    enabled: scope != null && Object.keys(scope).length > 0,
    staleTime: 30_000,
  });
}

export function useDownloadPlansSummary() {
  return useMutation({
    mutationFn: downloadPlansSummaryReport,
    onSuccess: () => toast.success("Download started."),
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Failed to download plans report.",
      ),
  });
}

export function useSetCustomerCycleBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setCustomerCycleBudget,
    onSuccess: () => {
      toast.success("Budget updated.");
      void queryClient.invalidateQueries({ queryKey: [...planningKeys.all, "chart"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Failed to update budget."),
  });
}
