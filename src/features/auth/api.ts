import { api } from "@/shared/services/api";
import { env } from "@/shared/lib/env";
import { sessionSchema, type Credentials, type Session } from "./schemas";

/**
 * Authenticates against the DRF token endpoint used by the Angular app:
 * `POST {authUrl}/login/` → `{ key, user }`.
 * The response is validated at the boundary so backend shape drift fails loudly.
 */
export async function login(credentials: Credentials): Promise<Session> {
  const data = await api.post<unknown>(`${env.authUrl}/login/`, credentials);
  return sessionSchema.parse(data);
}
