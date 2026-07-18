/** Minimal user shape for avatars / profile cards (list or detail payloads). */
export interface ProfileUser {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  role?: string | null;
  email?: string | null;
  phone_number?: string | null;
  rep_no?: string | number | null;
  notes?: string | null;
}
