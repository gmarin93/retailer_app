import type { ListableJob } from "@/features/jobs/schemas";
import type { PendingByClientEntry } from "./schemas";

export type HealthTone = "good" | "warn" | "bad" | "idle";

export function healthFromCounts(
  totalVisits: number,
  completion: number,
  overdueCount: number,
): { label: string; tone: HealthTone } {
  if (totalVisits === 0) return { label: "No visits", tone: "idle" };
  if (overdueCount > 0 && completion < 60) return { label: "Needs attention", tone: "bad" };
  if (completion >= 90 && overdueCount === 0) return { label: "On track", tone: "good" };
  return { label: "In progress", tone: "warn" };
}

export function storeLabel(job: ListableJob): string {
  const retailer = job.retailer?.title ?? "";
  const storeNo = job.store?.store_no != null ? String(job.store.store_no) : "";
  const storeTitle = job.store?.title ?? "";
  const label = `${retailer}${storeNo ? ` ${storeNo}` : ""}${storeTitle ? ` — ${storeTitle}` : ""}`.trim();
  return label || "Store";
}

export function assigneeLabel(job: ListableJob): string {
  const assignees = job.assignees ?? [];
  if (assignees.length === 0) return "Unassigned";
  const first = assignees[0]!;
  const name = [first.first_name, first.last_name].filter(Boolean).join(" ").trim();
  const label =
    name || first.email || (first.rep_no != null ? `Rep #${first.rep_no}` : "Assignee");
  return assignees.length > 1 ? `${label} +${assignees.length - 1}` : label;
}

export function closesLabel(job: ListableJob): string {
  if (!job.visit?.closes_at) return "";
  try {
    return new Date(job.visit.closes_at).toLocaleDateString();
  } catch {
    return job.visit.closes_at;
  }
}

/** Aggregate pending reviewable jobs by customer (Command Center scoped fallback). */
export function aggregatePendingByCustomer(jobs: ListableJob[]): PendingByClientEntry[] {
  const map = new Map<number, PendingByClientEntry>();
  for (const job of jobs) {
    if (job.status !== "pending" || job.customer?.id == null) continue;
    const existing = map.get(job.customer.id);
    if (existing) {
      existing.visits_count += 1;
    } else {
      map.set(job.customer.id, {
        customer_id: job.customer.id,
        customer_title: job.customer.title || "Unknown client",
        visits_count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.visits_count - a.visits_count);
}
