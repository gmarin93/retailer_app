import { z } from "zod";

// -- Active announcements (consumer feed, GET /v2/announcements/active/) ----

export const activeAnnouncementSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string().catch(""),
  body: z.string().catch(""),
  category: z.string().catch("general"),
  category_label: z.string().catch(""),
  priority: z.enum(["critical", "high", "normal", "low"]).catch("normal"),
  publish_at: z.string().nullish(),
  is_read: z.boolean().catch(false),
});

export type ActiveAnnouncement = z.infer<typeof activeAnnouncementSchema>;

export const activeAnnouncementsResponseSchema = z.object({
  results: z.array(activeAnnouncementSchema),
});

// -- Contacts (users with supervisor/manager roles) -------------------------

export const repContactSchema = z.looseObject({
  id: z.number(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  email: z.string().nullish(),
  role: z.string().nullish(),
  avatar: z.string().nullish(),
  is_active: z.boolean().catch(true),
});

export type RepContact = z.infer<typeof repContactSchema>;

export const repContactPageSchema = z.object({
  count: z.number(),
  results: z.array(repContactSchema),
});

// -- Visit counts (derived client-side from jobs) ---------------------------

export interface VisitCounts {
  newVisits: number;
  overdue: number;
  inProgress: number;
  submitted: number;
}

export function deriveAnalytics(counts: VisitCounts) {
  const total = counts.newVisits + counts.overdue + counts.inProgress + counts.submitted;
  const completionRate = total === 0 ? 0 : counts.submitted / total;
  const overdueRate = total === 0 ? 0 : counts.overdue / total;
  return {
    total,
    outstanding: counts.newVisits + counts.overdue + counts.inProgress,
    completionPercent: Math.round(completionRate * 100),
    overduePercent: Math.round(overdueRate * 100),
    completionRate,
    isEmpty: total === 0,
  };
}

export const CONTACT_ROLES = [
  "account_manager",
  "sr_field_supervisor",
  "field_supervisor",
  "finances",
  "operations",
] as const;
