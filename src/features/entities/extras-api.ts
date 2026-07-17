import { env } from "@/shared/lib/env";
import { api, apiPatchForm } from "@/shared/services/api";
import { resultsPageSchema } from "@/shared/services/api/pagination";
import { patchEntity } from "./api";
import {
  detailedStoreSchema,
  listableEntityLiteSchema,
  type BulkLogoEntityKind,
  type DetailedStore,
  type ListableEntityLite,
  type StoreSetUserPrioritiesRequest,
} from "./schemas";

const v2 = `${env.apiHost}/v2`;

/** Search v2 list endpoints for autocomplete (page size 10, Angular parity). */
export async function searchEntitiesV2(
  route: "stores" | "customers" | "retailers" | "users" | "programs",
  query: string,
  signal?: AbortSignal,
  extraParams?: Record<string, string | number | undefined>,
): Promise<ListableEntityLite[]> {
  const data = await api.get<unknown>(`${v2}/${route}/`, {
    searchParams: {
      _search: query,
      _page: 1,
      _page_size: 10,
      ...extraParams,
    },
    signal,
  });
  return resultsPageSchema(listableEntityLiteSchema).parse(data).results;
}

export async function fetchStoreDetailV2(
  id: number,
  signal?: AbortSignal,
): Promise<DetailedStore> {
  const data = await api.get<unknown>(`${v2}/stores/${id}/`, { signal });
  return detailedStoreSchema.parse(data);
}

/** `PATCH /v2/stores/{id}/` with multipart `avatar`. */
export async function patchStoreAvatar(id: number, file: File): Promise<DetailedStore> {
  const formData = new FormData();
  formData.append("avatar", file);
  const data = await apiPatchForm<unknown>(`${v2}/stores/${id}/`, formData);
  return detailedStoreSchema.parse(data);
}

export async function setStoreUserPriorities(
  id: number,
  body: StoreSetUserPrioritiesRequest,
): Promise<DetailedStore> {
  const data = await api.post<unknown>(`${v2}/stores/${id}/set_user_priorities/`, body);
  return detailedStoreSchema.parse(data);
}

/** Upload one logo row for the bulk dialog (store→v2, customer/retailer→v0). */
export async function uploadEntityAvatar(
  kind: BulkLogoEntityKind,
  id: number,
  file: File,
): Promise<void> {
  if (kind === "store") {
    await patchStoreAvatar(id, file);
    return;
  }
  await patchEntity(kind === "customer" ? "customers" : "retailers", id, { avatar: file });
}
