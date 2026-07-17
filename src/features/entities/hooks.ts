import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import {
  fetchStoreDetailV2,
  patchStoreAvatar,
  searchEntitiesV2,
  setStoreUserPriorities,
} from "./extras-api";
import type { StoreSetUserPrioritiesRequest } from "./schemas";

export const entityKeys = {
  all: ["entities"] as const,
  list: (route: string) => [...entityKeys.all, route, "list"] as const,
  storeDetail: (id: number) => [...entityKeys.all, "stores", "v2-detail", id] as const,
  search: (
    route: string,
    query: string,
    extra?: Record<string, string | number | undefined>,
  ) => [...entityKeys.all, "search", route, query, extra ?? {}] as const,
};

export function useStoreDetailV2(storeId: number | null, enabled = true) {
  return useQuery({
    queryKey: entityKeys.storeDetail(storeId ?? 0),
    queryFn: ({ signal }) => fetchStoreDetailV2(storeId!, signal),
    enabled: enabled && storeId !== null,
  });
}

export function useEntitySearch(
  route: "stores" | "customers" | "retailers" | "users" | "programs",
  query: string,
  enabled = true,
  extraParams?: Record<string, string | number | undefined>,
) {
  const q = query.trim();
  return useQuery({
    queryKey: entityKeys.search(route, q, extraParams),
    queryFn: ({ signal }) => searchEntitiesV2(route, q, signal, extraParams),
    enabled: enabled && q.length >= 1,
  });
}

export function usePatchStoreAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => patchStoreAvatar(id, file),
    onSuccess: (_data, vars) => {
      toast.success("Store logo updated");
      void queryClient.invalidateQueries({ queryKey: entityKeys.list("stores") });
      void queryClient.invalidateQueries({ queryKey: entityKeys.storeDetail(vars.id) });
      void queryClient.invalidateQueries({
        queryKey: [...entityKeys.all, "stores", "detail", vars.id],
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? `Failed to update logo: ${error.message}` : "Failed to update logo",
      ),
  });
}

export function useSetStoreUserPriorities(storeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreSetUserPrioritiesRequest) => setStoreUserPriorities(storeId, body),
    onSuccess: () => {
      toast.success("Rep assignments updated");
      void queryClient.invalidateQueries({ queryKey: entityKeys.list("stores") });
      void queryClient.invalidateQueries({ queryKey: entityKeys.storeDetail(storeId) });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? `Failed to update assignments: ${error.message}`
          : "Failed to update assignments",
      ),
  });
}
