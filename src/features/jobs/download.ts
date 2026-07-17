import { format } from "date-fns";
import { fetchPhotosReport, type JobsQuery, type JobsView } from "./api";

const CHUNK_SIZE = 300;
const CONCURRENCY = 6;

interface PhotoTask {
  url: string;
  filename: string;
}

function stamp(): string {
  return format(new Date(), "yyyy-MM-dd_HHmmss");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

async function zipChunk(tasks: PhotoTask[], part: number, totalParts: number) {
  // Loaded on demand: jszip is only needed once a user actually exports photos.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (task) => {
        const blob = await fetchBlob(task.url);
        return blob ? { task, blob } : null;
      }),
    );
    for (const result of results) {
      if (!result) continue;
      const name = result.task.filename || `photo-${Math.random().toString(36).slice(2)}.jpg`;
      zip.file(name, result.blob, { compression: "STORE" });
    }
  }
  const buffer = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const suffix = totalParts > 1 ? `_part-${part}` : "";
  saveBlob(buffer, `VisitPhotosReport_${stamp()}${suffix}.zip`);
}

/** Build and download photo ZIPs for the given jobs query (Angular jobs-download). */
export async function downloadPhotosZip(
  query: Omit<JobsQuery, "page" | "pageSize" | "order"> & {
    order?: string[];
    view?: JobsView;
  },
  onProgress?: (message: string) => void,
): Promise<number> {
  onProgress?.("Loading photo list…");
  const jobs = await fetchPhotosReport(query);
  const tasks: PhotoTask[] = [];
  for (const job of jobs) {
    for (const photo of job.photo_responses) {
      if (!photo.photo_location) continue;
      tasks.push({
        url: photo.photo_location,
        filename: photo.photo_filename || `job-${job.id}.jpg`,
      });
    }
  }
  if (tasks.length === 0) return 0;

  const chunks: PhotoTask[][] = [];
  for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
    chunks.push(tasks.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Zipping photos (${i + 1}/${chunks.length})…`);
    await zipChunk(chunks[i]!, i + 1, chunks.length);
  }
  return tasks.length;
}
