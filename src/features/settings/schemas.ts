import { z } from "zod";

export const AnnouncementStatus = z.enum(["draft", "published", "archived"]);
export type AnnouncementStatus = z.infer<typeof AnnouncementStatus>;

export const AnnouncementEffectiveStatus = z.enum([
  "draft",
  "published",
  "archived",
  "expired",
]);
export type AnnouncementEffectiveStatus = z.infer<typeof AnnouncementEffectiveStatus>;

export const AnnouncementPriority = z.enum(["critical", "high", "normal", "low"]);
export type AnnouncementPriority = z.infer<typeof AnnouncementPriority>;

export const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  category: z.string(),
  priority: AnnouncementPriority,
  status: AnnouncementStatus,
  effective_status: AnnouncementEffectiveStatus,
  publish_at: z.string(),
  expires_at: z.string().nullable(),
  target_roles: z.array(z.string()),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Announcement = z.infer<typeof announcementSchema>;

export const announcementPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(announcementSchema),
});

/** Payload for create/update — matches the DRF serializer write fields. */
export interface AnnouncementPayload {
  title: string;
  summary: string;
  body: string;
  category: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publish_at: string;
  expires_at: string | null;
  target_roles: string[];
}

export const mobileAppVersionSettingsSchema = z.object({
  androidLatestVersion: z.string(),
  iosLatestVersion: z.string(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string(),
});
export type MobileAppVersionSettings = z.infer<typeof mobileAppVersionSettingsSchema>;

export const ANNOUNCEMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "new_features", label: "New Features" },
  { value: "system_updates", label: "System Updates" },
  { value: "maintenance", label: "Maintenance" },
  { value: "general", label: "General Information" },
  { value: "operational", label: "Operational Changes" },
  { value: "safety", label: "Safety Notices" },
  { value: "tips", label: "Tips & Best Practices" },
  { value: "alerts", label: "Important Alerts" },
];

export const ANNOUNCEMENT_PRIORITIES: { value: AnnouncementPriority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "expired", label: "Expired" },
];
