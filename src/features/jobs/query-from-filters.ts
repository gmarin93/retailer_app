import type { JobsQuery } from "./api";
import type { JobsFilterFields } from "./filters";

/** Merge advanced filter fields into a jobs list query (preserves input shape). */
export function applyJobsFilterFields<T extends Partial<JobsQuery>>(
  base: T,
  filter: JobsFilterFields,
): T {
  return {
    ...base,
    statuses: filter.statuses.length ? filter.statuses : base.statuses,
    customers: filter.customers.length ? filter.customers : base.customers,
    retailers: filter.retailers.length ? filter.retailers : base.retailers,
    programs: filter.programs.length ? filter.programs : base.programs,
    cycles: filter.cycles.length ? filter.cycles : base.cycles,
    assignees: filter.unassigned
      ? undefined
      : filter.assignees.length
        ? filter.assignees
        : base.assignees,
    stores: filter.stores.length ? filter.stores : base.stores,
    storeRegions: filter.storeRegions.length ? filter.storeRegions : base.storeRegions,
    provinces: filter.provinces.length ? filter.provinces : base.provinces,
    ids: filter.ids.length ? filter.ids : base.ids,
    opensOn: filter.opensOn ?? undefined,
    closesOn: filter.closesOn ?? undefined,
    periodStart: filter.periodStart ?? undefined,
    periodEnd: filter.periodEnd ?? undefined,
    overdue: filter.overdue || base.overdue || undefined,
    unassigned: filter.unassigned || base.unassigned || undefined,
    noStatusCode: filter.noStatusCode || undefined,
    statusCodes: filter.statusCodes.length ? filter.statusCodes : undefined,
    groups: filter.groups.length ? filter.groups : undefined,
  };
}
