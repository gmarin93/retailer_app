/**
 * Advanced jobs filter fields, ported from Angular `JobFilterFields` /
 * `jobs-query.component`. Applied on top of text search.
 */
export interface JobsFilterFields {
  statuses: string[];
  customers: number[];
  retailers: number[];
  programs: number[];
  cycles: number[];
  assignees: number[];
  stores: number[];
  storeRegions: number[];
  provinces: string[];
  ids: number[];
  opensOn: string | null;
  closesOn: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  overdue: boolean;
  unassigned: boolean;
  noStatusCode: boolean;
  statusCodes: string[];
  groups: string[];
}

export const EMPTY_JOBS_FILTER: JobsFilterFields = {
  statuses: [],
  customers: [],
  retailers: [],
  programs: [],
  cycles: [],
  assignees: [],
  stores: [],
  storeRegions: [],
  provinces: [],
  ids: [],
  opensOn: null,
  closesOn: null,
  periodStart: null,
  periodEnd: null,
  overdue: false,
  unassigned: false,
  noStatusCode: false,
  statusCodes: [],
  groups: [],
};

export function hasActiveJobsFilter(filter: JobsFilterFields): boolean {
  return (
    filter.statuses.length > 0 ||
    filter.customers.length > 0 ||
    filter.retailers.length > 0 ||
    filter.programs.length > 0 ||
    filter.cycles.length > 0 ||
    filter.assignees.length > 0 ||
    filter.stores.length > 0 ||
    filter.storeRegions.length > 0 ||
    filter.provinces.length > 0 ||
    filter.ids.length > 0 ||
    filter.opensOn != null ||
    filter.closesOn != null ||
    filter.periodStart != null ||
    filter.periodEnd != null ||
    filter.overdue ||
    filter.unassigned ||
    filter.noStatusCode ||
    filter.statusCodes.length > 0 ||
    filter.groups.length > 0
  );
}

export const JOB_STATUS_OPTIONS = [
  { value: "planned", label: "Planning" },
  { value: "open", label: "Work in progress" },
  { value: "pending", label: "Submitted" },
  { value: "completed", label: "Reviewed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "invoiced", label: "Customer Invoiced" },
] as const;

export function parseIdList(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function parseGroupList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
