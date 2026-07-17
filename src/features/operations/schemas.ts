import { z } from "zod";

const baseItinerarySchema = z.looseObject({
  count: z.number().catch(0),
  count_planned: z.number().catch(0),
  minutes: z.number().catch(0),
  per_status: z.record(z.string(), z.number()).catch({}),
  per_week: z.array(z.number()).catch([]),
});

export const itineraryUserSchema = z.looseObject({
  id: z.number(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  username: z.string().catch(""),
  avatar: z.string().nullish(),
  rep_no: z.union([z.string(), z.number()]).nullish(),
  max_hours: z.number().nullish(),
});

export const userItinerarySchema = baseItinerarySchema.extend({
  user: itineraryUserSchema,
});

export const itineraryReportSchema = baseItinerarySchema.extend({
  cycle: z.looseObject({ id: z.number(), title: z.string().catch("") }),
  // API returns a sorted array (see jobs/actions/itineraries.py), not a map.
  per_user: z.array(userItinerarySchema).catch([]),
  unassigned: baseItinerarySchema.optional(),
});

export type ItineraryUser = z.infer<typeof itineraryUserSchema>;
export type UserItinerary = z.infer<typeof userItinerarySchema>;
export type ItineraryReport = z.infer<typeof itineraryReportSchema>;

export type WeekStatus = "unknown" | "under" | "near" | "over";

export function weekStatus(weekMinutes: number, maxHours: number | null | undefined): WeekStatus {
  if (maxHours == null || maxHours <= 0) return "unknown";
  const maxMinutes = maxHours * 60;
  if (weekMinutes <= maxMinutes * 0.9) return "under";
  if (weekMinutes <= maxMinutes) return "near";
  return "over";
}

export function formatUserName(user: ItineraryUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.username || `User #${user.id}`;
}
