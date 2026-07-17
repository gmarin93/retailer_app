import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import { itineraryReportSchema, type ItineraryReport } from "./schemas";

const v2 = `${env.apiHost}/v2`;

export interface ItineraryReportQuery {
  cycle: number;
  province?: string | null;
  reps?: string | null;
}

/** `GET /v2/jobs/itineraries/` — cycle itinerary report for Operations. */
export async function fetchItineraryReport(
  query: ItineraryReportQuery,
  signal?: AbortSignal,
): Promise<ItineraryReport> {
  const data = await api.get<unknown>(`${v2}/jobs/itineraries/`, {
    searchParams: {
      cycle: query.cycle,
      province: query.province || undefined,
      reps: query.reps?.trim() || undefined,
    },
    signal,
  });
  return itineraryReportSchema.parse(data);
}
