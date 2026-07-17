import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";
import { listableJobSchema, type ListableJob } from "@/features/jobs/schemas";

/**
 * Proof-of-Execution showcase data (ported from `showcase.component.ts`):
 * reviewable jobs + the photos report, joined per store client-side.
 */

const v2 = `${env.apiHost}/v2`;

const photosReportJobSchema = z.looseObject({
  id: z.number(),
  photo_responses: z
    .array(
      z.looseObject({
        photo_filename: z.string().catch(""),
        photo_location: z.string().catch(""),
      }),
    )
    .catch([]),
});

export type PhotosReportJob = z.infer<typeof photosReportJobSchema>;

const photosReportPageSchema = resultsPageSchema(photosReportJobSchema);
const jobPageSchema = resultsPageSchema(listableJobSchema);

export interface ShowcaseScope {
  customerId: number;
  cycleId: number;
  programId?: number;
}

function scopeParams(scope: ShowcaseScope) {
  return {
    program__customer__id__in: scope.customerId,
    cycle__id__in: scope.cycleId,
    program__id__in: scope.programId,
  };
}

/** All reviewable jobs in scope (visits for the brand + cycle [+ program]). */
export async function fetchShowcaseJobs(
  scope: ShowcaseScope,
  signal?: AbortSignal,
): Promise<ListableJob[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/jobs/reviewable/`, {
      searchParams: { ...scopeParams(scope), _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return jobPageSchema.parse(data);
  });
}

/** Per-job photo listing (`jobs/reviewable/photos_report/`). */
export async function fetchShowcasePhotosReport(
  scope: ShowcaseScope,
  signal?: AbortSignal,
): Promise<PhotosReportJob[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/jobs/reviewable/photos_report/`, {
      searchParams: { ...scopeParams(scope), _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return photosReportPageSchema.parse(data);
  });
}

// -- Aggregation (ported from `buildStores`) --------------------------------

export interface ShowcasePhoto {
  url: string;
  filename: string;
  store: string;
}

export interface ShowcaseStore {
  storeId: number;
  retailer: string;
  storeNo: string;
  title: string;
  lastVisit: Date | null;
  completed: boolean;
  visitCount: number;
  photos: ShowcasePhoto[];
}

/** Joins jobs with their photo report and aggregates per store. */
export function buildShowcaseStores(
  jobs: ListableJob[],
  photoReports: PhotosReportJob[],
): ShowcaseStore[] {
  const photosByJob = new Map<number, ShowcasePhoto[]>();
  for (const report of photoReports) {
    const photos = report.photo_responses
      .filter((r) => !!r.photo_location)
      .map((r) => ({ url: r.photo_location, filename: r.photo_filename, store: "" }));
    if (photos.length > 0) photosByJob.set(report.id, photos);
  }

  const byStore = new Map<number, ShowcaseStore>();
  for (const job of jobs) {
    const storeId = job.store?.id;
    if (storeId == null) continue;
    const completed = job.status === "completed" || job.status === "invoiced";
    const storeName = `${job.retailer?.title ?? ""} ${job.store?.store_no ?? ""}`.trim();

    let entry = byStore.get(storeId);
    if (!entry) {
      entry = {
        storeId,
        retailer: job.retailer?.title ?? "Store",
        storeNo: String(job.store?.store_no ?? ""),
        title: job.store?.title ?? "",
        lastVisit: null,
        completed: false,
        visitCount: 0,
        photos: [],
      };
      byStore.set(storeId, entry);
    }

    entry.completed = entry.completed || completed;
    if (completed) {
      entry.visitCount += 1;
      const visitDate = job.completed_on ?? job.visit?.closes_at ?? null;
      if (visitDate) {
        const d = new Date(visitDate);
        if (!entry.lastVisit || d > entry.lastVisit) entry.lastVisit = d;
      }
    }

    const jobPhotos = photosByJob.get(job.id);
    if (jobPhotos) {
      for (const photo of jobPhotos) entry.photos.push({ ...photo, store: storeName });
    }
  }

  return Array.from(byStore.values()).sort((a, b) => {
    if (b.photos.length !== a.photos.length) return b.photos.length - a.photos.length;
    return (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0);
  });
}
