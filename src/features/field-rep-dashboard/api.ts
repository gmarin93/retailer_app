import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import { fetchAllPages, resultsPageSchema } from "@/shared/services/api/pagination";
import {
  activeAnnouncementsResponseSchema,
  repContactSchema,
  type ActiveAnnouncement,
  type RepContact,
  CONTACT_ROLES,
} from "./schemas";

const v2 = `${env.apiHost}/v2`;

// -- Active announcements ---------------------------------------------------

/** Published announcements for the current user, with per-user read status. */
export async function fetchActiveAnnouncements(
  signal?: AbortSignal,
): Promise<ActiveAnnouncement[]> {
  const data = await api.get<unknown>(`${v2}/announcements/active/`, { signal });
  return activeAnnouncementsResponseSchema.parse(data).results;
}

/** Record a read receipt for an announcement (optimistic on the client). */
export async function markAnnouncementRead(id: number): Promise<void> {
  await api.post(`${v2}/announcements/${id}/mark_read/`);
}

// -- Visit counts (lightweight count-only requests) ------------------------

interface CountResult {
  count?: number;
}

async function fetchJobCount(
  searchParams: Record<string, string | number | boolean | undefined | null>,
  signal?: AbortSignal,
): Promise<number> {
  try {
    const data = await api.get<CountResult>(`${v2}/jobs/`, {
      searchParams: { ...searchParams, _page_size: 1 },
      signal,
    });
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface FieldRepVisitCounts {
  newVisits: number;
  overdue: number;
  inProgress: number;
  submitted: number;
}

/** Four parallel count requests — each fetches page_size=1 and reads `count`. */
export async function fetchFieldRepVisitCounts(
  signal?: AbortSignal,
): Promise<FieldRepVisitCounts> {
  const today = todayLocalISO();
  const [newVisits, openCount, overdueCount, submitted] = await Promise.all([
    fetchJobCount({ status__in: "planned" }, signal),
    fetchJobCount({ status__in: "open" }, signal),
    fetchJobCount({ status__in: "open", visit__closes_at__lt: today }, signal),
    fetchJobCount({ status__in: "pending" }, signal),
  ]);
  return {
    newVisits,
    overdue: overdueCount,
    inProgress: Math.max(0, openCount - overdueCount),
    submitted,
  };
}

// -- Contacts (supervisor/manager roles) ------------------------------------

const contactPageSchema = resultsPageSchema(repContactSchema);

export async function fetchRepContacts(signal?: AbortSignal): Promise<RepContact[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/users/`, {
      searchParams: {
        role__in: CONTACT_ROLES.join(","),
        is_active: "True",
        _order: "first_name",
        _page: page,
        _page_size: 100,
      },
      signal,
    });
    return contactPageSchema.parse(data);
  });
}
