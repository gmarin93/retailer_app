import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api, apiPatchForm, apiPostForm } from "@/shared/services/api";
import type { EntityRecord } from "./types";

/**
 * Generic v0 entity CRUD (ported from `ApiV0Service`): list endpoints return
 * plain arrays; create/patch send multipart form data (`makeFormData` parity).
 */

const v0 = `${env.apiHost}/v0`;

const recordSchema = z.looseObject({ id: z.number() });
const recordListSchema = z.array(recordSchema);

/** DRF hyperlinked identity used by v0 program/customer/retailer FKs. */
export function entityResourceUrl(route: string, id: number): string {
  return `${v0}/${route}/${id}/`;
}

export async function fetchEntityList(
  route: string,
  signal?: AbortSignal,
): Promise<EntityRecord[]> {
  const data = await api.get<unknown>(`${v0}/${route}/`, { signal });
  return recordListSchema.parse(data) as EntityRecord[];
}

export async function fetchEntityDetail(
  route: string,
  id: number,
  signal?: AbortSignal,
): Promise<EntityRecord> {
  const data = await api.get<unknown>(`${v0}/${route}/${id}/`, { signal });
  return recordSchema.parse(data) as EntityRecord;
}

function toFormData(values: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (value instanceof File) formData.append(key, value);
    else formData.append(key, String(value));
  }
  return formData;
}

export async function createEntity(
  route: string,
  values: Record<string, unknown>,
): Promise<EntityRecord> {
  const data = await apiPostForm<unknown>(`${v0}/${route}/`, toFormData(values));
  return recordSchema.parse(data) as EntityRecord;
}

export async function patchEntity(
  route: string,
  id: number,
  values: Record<string, unknown>,
): Promise<EntityRecord> {
  const data = await apiPatchForm<unknown>(`${v0}/${route}/${id}/`, toFormData(values));
  return recordSchema.parse(data) as EntityRecord;
}

export async function deleteEntity(route: string, id: number): Promise<void> {
  await api.delete(`${v0}/${route}/${id}/`);
}
