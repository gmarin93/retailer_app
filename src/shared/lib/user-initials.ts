/**
 * Initials for avatar placeholder when the user has no profile photo.
 * With full name visible: first + last initial; otherwise username (2 chars).
 * Ported from Angular `utils/user-initials.ts`.
 */
export function getUserDisplayInitials(
  user: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  },
  canViewFullName: boolean,
): string {
  if (canViewFullName) {
    const first = (user.first_name || "").trim();
    const last = (user.last_name || "").trim();
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    const single = (first || last).replace(/\s+/g, "");
    if (single.length >= 2) return single.slice(0, 2).toUpperCase();
    if (single.length === 1) return single.toUpperCase();
  }
  const raw = (user.username || "").replace(/^@/, "").trim() || "user";
  const alnum = raw.replace(/[^a-zA-Z0-9]/g, "");
  const src = alnum.length >= 2 ? alnum : raw;
  return src.slice(0, 2).toUpperCase();
}
