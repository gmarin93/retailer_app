import { z } from "zod";
import { UserRole } from "./types";

export const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/**
 * Session user returned by `POST /rest-auth/login/`.
 *
 * Only the fields the frontend actually reads are validated; the rest of the
 * payload is preserved via `looseObject` so nothing is lost when the session
 * is persisted (the Angular app stores the full serialized user the same way).
 */
export const sessionUserSchema = z.looseObject({
  id: z.number(),
  username: z.string(),
  role: z.enum(UserRole),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  email: z.string().nullish(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/** DRF token-auth session payload: `{ key, user }`. */
export const sessionSchema = z.object({
  key: z.string().min(1),
  user: sessionUserSchema,
});

export type Session = z.infer<typeof sessionSchema>;

export function formatUserName(user: SessionUser): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return fullName || user.username;
}

/** Avatar initials from first/last name (letters only) — never punctuation from display labels. */
export function formatUserInitials(user: SessionUser): string {
  const letter = (value: string | null | undefined) => {
    const match = value?.match(/[A-Za-z]/);
    return match?.[0]?.toUpperCase() ?? "";
  };
  const first = letter(user.first_name);
  const last = letter(user.last_name);
  if (first && last) return `${first}${last}`;
  if (first) return first;
  const fromUsername = letter(user.username);
  return fromUsername || "?";
}
