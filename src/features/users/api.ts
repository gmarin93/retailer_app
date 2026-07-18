import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";

const v2 = `${env.apiHost}/v2`;

export const detailedUserSchema = z.looseObject({
  id: z.number(),
  username: z.string().catch(""),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  email: z.string().nullish(),
  phone_number: z.string().nullish(),
  role: z.string().nullish(),
  avatar: z.string().nullish(),
  rep_no: z.union([z.string(), z.number()]).nullish(),
  notes: z.string().nullish(),
});

export type DetailedUser = z.infer<typeof detailedUserSchema>;

/** `GET /v2/users/{id}/` — contact details for the user profile card. */
export async function fetchDetailedUser(
  id: number,
  signal?: AbortSignal,
): Promise<DetailedUser> {
  const data = await api.get<unknown>(`${v2}/users/${id}/`, { signal });
  return detailedUserSchema.parse(data);
}
