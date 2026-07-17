import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import type { AnnouncementPayload, AnnouncementStatus } from "./schemas";
import {
  announcementPageSchema,
  announcementSchema,
  mobileAppVersionSettingsSchema,
} from "./schemas";

const v2 = `${env.apiHost}/v2`;

export async function fetchAnnouncements(
  options: { status?: string; category?: string; search?: string } = {},
  signal?: AbortSignal,
) {
  const data = await api.get<unknown>(`${v2}/announcements/`, {
    searchParams: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.search ? { search: options.search } : {}),
    },
    signal,
  });
  return announcementPageSchema.parse(data).results;
}

export async function createAnnouncement(payload: AnnouncementPayload) {
  const data = await api.post<unknown>(`${v2}/announcements/`, payload);
  return announcementSchema.parse(data);
}

export async function updateAnnouncement(id: number, payload: AnnouncementPayload) {
  const data = await api.put<unknown>(`${v2}/announcements/${id}/`, payload);
  return announcementSchema.parse(data);
}

/** Quick status-only update (publish / archive). Sends the full required payload. */
export async function patchAnnouncementStatus(
  announcement: {
    id: number;
    title: string;
    summary: string;
    body: string;
    category: string;
    priority: string;
    publish_at: string;
    expires_at: string | null;
    target_roles: string[];
  },
  status: AnnouncementStatus,
) {
  const payload: AnnouncementPayload = {
    title: announcement.title,
    summary: announcement.summary,
    body: announcement.body,
    category: announcement.category,
    priority: announcement.priority as AnnouncementPayload["priority"],
    status,
    publish_at: announcement.publish_at,
    expires_at: announcement.expires_at,
    target_roles: announcement.target_roles,
  };
  return updateAnnouncement(announcement.id, payload);
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await api.delete(`${v2}/announcements/${id}/`);
}

export async function fetchMobileAppVersionSettings(signal?: AbortSignal) {
  const data = await api.get<unknown>(`${v2}/settings/mobile-app-version/`, { signal });
  return mobileAppVersionSettingsSchema.parse(data);
}

export async function updateMobileAppVersionSettings(payload: {
  androidLatestVersion: string;
  iosLatestVersion: string;
}) {
  const data = await api.put<unknown>(`${v2}/settings/mobile-app-version/`, payload);
  return mobileAppVersionSettingsSchema.parse(data);
}
