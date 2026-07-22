"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/hooks";
import {
  canReviewJobs,
  isElevatedOrManager,
} from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { PROVINCE_OPTIONS } from "@/shared/constants/provinces";
import { cn } from "@/shared/lib/utils";
import { useCyclesByDate } from "@/shared/services/entities/cycles";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useActiveProgramsFiltered } from "@/shared/services/entities/programs";
import { useRetailersByTitle } from "@/shared/services/entities/retailers";
import {
  formatStoreLabel,
  useFilteredStores,
  useStoreRegions,
} from "@/shared/services/entities/stores";
import { useAllReps, useJobStatusCodes } from "../hooks";
import {
  EMPTY_JOBS_FILTER,
  JOB_STATUS_OPTIONS,
  parseGroupList,
  parseIdList,
  type JobsFilterFields,
} from "../filters";

interface JobsFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: JobsFilterFields;
  onApply: (next: JobsFilterFields) => void;
  /** Show assignee / unassigned controls (review roles). */
  showAssignees?: boolean;
}

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelectField({
  id,
  label,
  values,
  options,
  placeholder,
  emptyLabel,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  options: MultiSelectOption[];
  placeholder: string;
  emptyLabel?: string;
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return values.map((v) => map.get(v) ?? v);
  }, [options, values]);

  const triggerText =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? selectedLabels[0]
        : `${label} (${values.length})`;

  const toggle = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between font-normal",
              values.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">{triggerText}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {emptyLabel ?? "No options"}
            </p>
          ) : (
            options.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={values.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
                onSelect={(event) => event.preventDefault()}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
          {values.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/**
 * Advanced filter sheet for jobs lists (Angular `jobs-query` panel parity).
 * Quick-filter pills live in the toolbar; this panel holds the full form.
 */
export function JobsFilterPanel({
  open,
  onOpenChange,
  value,
  onApply,
  showAssignees = true,
}: JobsFilterPanelProps) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const canReview = canReviewJobs(role);
  const canPeriods = isElevatedOrManager(role);

  const [draft, setDraft] = useState<JobsFilterFields>(value);
  const [idsText, setIdsText] = useState(value.ids.join(", "));
  const [groupsText, setGroupsText] = useState(value.groups.join(", "));

  const customers = useCustomersByTitle();
  const retailers = useRetailersByTitle(open);
  const cycles = useCyclesByDate();
  const reps = useAllReps(open && showAssignees);
  const statusCodes = useJobStatusCodes({}, open && canReview);
  const programs = useActiveProgramsFiltered(
    { customers: draft.customers, retailers: draft.retailers },
    open,
  );
  const storeRegions = useStoreRegions(
    { provinces: draft.provinces },
    open && canReview,
  );
  // Drop dependent selections that are no longer in the option list (derived,
  // so the async option refetch can't leave stale ids behind).
  const draftPrograms = useMemo(() => {
    if (!programs.data) return draft.programs;
    const allowed = new Set(programs.data.map((p) => p.id));
    return draft.programs.filter((id) => allowed.has(id));
  }, [programs.data, draft.programs]);

  const draftStoreRegions = useMemo(() => {
    if (!storeRegions.data) return draft.storeRegions;
    const allowed = new Set(storeRegions.data.map((r) => r.id));
    return draft.storeRegions.filter((id) => allowed.has(id));
  }, [storeRegions.data, draft.storeRegions]);

  const stores = useFilteredStores(
    {
      retailers: draft.retailers,
      provinces: draft.provinces,
      regions: draftStoreRegions,
    },
    open,
  );

  const draftStores = useMemo(() => {
    if (!stores.isFetched) return draft.stores;
    const allowed = new Set((stores.data ?? []).map((s) => s.id));
    return draft.stores.filter((id) => allowed.has(id));
  }, [stores.data, stores.isFetched, draft.stores]);

  const syncOpen = (next: boolean) => {
    if (next) {
      setDraft(value);
      setIdsText(value.ids.join(", "));
      setGroupsText(value.groups.join(", "));
    }
    onOpenChange(next);
  };

  const handleApply = () => {
    onApply({
      ...draft,
      programs: draftPrograms,
      storeRegions: draftStoreRegions,
      stores: draftStores,
      ids: parseIdList(idsText),
      groups: parseGroupList(groupsText),
    });
    onOpenChange(false);
  };

  const toggleStatus = (status: string) => {
    setDraft((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={syncOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter visits</SheetTitle>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            handleApply();
          }}
        >
        <div className="flex-1 space-y-6 overflow-auto px-4 py-2">
          {showAssignees && (
            <Section title="People & assignment">
              <MultiSelectField
                id="jf-assignees"
                label="Assignees"
                placeholder="All assignees"
                values={draft.assignees.map(String)}
                options={(reps.data ?? []).map((rep) => ({
                  value: String(rep.id),
                  label:
                    [rep.rep_no, [rep.first_name, rep.last_name].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(" — ") || `User #${rep.id}`,
                }))}
                disabled={draft.unassigned}
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    assignees: next.map(Number),
                    unassigned: false,
                  }))
                }
              />
              <Button
                type="button"
                size="sm"
                variant={draft.unassigned ? "default" : "outline"}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    unassigned: !prev.unassigned,
                    assignees: [],
                  }))
                }
              >
                Unassigned only
              </Button>
            </Section>
          )}

          <Section title="Customer & location">
            <MultiSelectField
              id="jf-customer"
              label="Customer"
              placeholder="All customers"
              values={draft.customers.map(String)}
              options={(customers.data ?? []).map((c) => ({
                value: String(c.id),
                label: c.title,
              }))}
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  customers: next.map(Number),
                  programs: [],
                }))
              }
            />
            <MultiSelectField
              id="jf-retailer"
              label="Retailers"
              placeholder="All retailers"
              values={draft.retailers.map(String)}
              options={(retailers.data ?? []).map((r) => ({
                value: String(r.id),
                label: r.title,
              }))}
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  retailers: next.map(Number),
                  programs: [],
                  stores: [],
                }))
              }
            />
            <MultiSelectField
              id="jf-program"
              label="Programs"
              placeholder="All programs"
              emptyLabel="Select a customer or retailer first"
              values={draftPrograms.map(String)}
              options={(programs.data ?? []).map((p) => ({
                value: String(p.id),
                label: p.title,
              }))}
              disabled={!programs.isFetching && (programs.data?.length ?? 0) === 0}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, programs: next.map(Number) }))
              }
            />
            <div className="space-y-1.5">
              <Label htmlFor="jf-groups">Groups</Label>
              <Input
                id="jf-groups"
                value={groupsText}
                onChange={(e) => setGroupsText(e.target.value)}
                placeholder="e.g. A, B"
              />
            </div>
            <MultiSelectField
              id="jf-store"
              label="Store"
              placeholder="All stores"
              emptyLabel="Select a retailer, province, or region first"
              values={draftStores.map(String)}
              options={(stores.data ?? []).map((s) => ({
                value: String(s.id),
                label: formatStoreLabel(s),
              }))}
              disabled={!stores.isFetching && (stores.data?.length ?? 0) === 0}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, stores: next.map(Number) }))
              }
            />
            {canReview && (
              <MultiSelectField
                id="jf-regions"
                label="Regions"
                placeholder="All regions"
                values={draftStoreRegions.map(String)}
                options={(storeRegions.data ?? []).map((r) => ({
                  value: String(r.id),
                  label: r.province ? `${r.name} (${r.province})` : r.name,
                }))}
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    storeRegions: next.map(Number),
                    stores: [],
                  }))
                }
              />
            )}
            {(canReview || showAssignees) && (
              <MultiSelectField
                id="jf-province"
                label="Provinces"
                placeholder="All provinces"
                values={draft.provinces}
                options={PROVINCE_OPTIONS.map((p) => ({
                  value: p.value,
                  label: p.label,
                }))}
                onChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    provinces: next,
                    storeRegions: [],
                    stores: [],
                  }))
                }
              />
            )}
          </Section>

          <Section title="Dates & cycles">
            <MultiSelectField
              id="jf-cycle"
              label="Cycle"
              placeholder="All cycles"
              values={draft.cycles.map(String)}
              options={(cycles.data ?? []).map((c) => ({
                value: String(c.id),
                label: c.title,
              }))}
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, cycles: next.map(Number) }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jf-opens">Start date</Label>
                <Input
                  id="jf-opens"
                  type="date"
                  value={draft.opensOn ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, opensOn: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jf-closes">Due date</Label>
                <Input
                  id="jf-closes"
                  type="date"
                  value={draft.closesOn ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, closesOn: e.target.value || null }))
                  }
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={draft.overdue ? "default" : "outline"}
              onClick={() => setDraft((prev) => ({ ...prev, overdue: !prev.overdue }))}
            >
              Overdue only
            </Button>
            {canPeriods && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jf-period-start">Period start</Label>
                  <Input
                    id="jf-period-start"
                    type="date"
                    value={draft.periodStart ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodStart: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jf-period-end">Period end</Label>
                  <Input
                    id="jf-period-end"
                    type="date"
                    value={draft.periodEnd ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodEnd: e.target.value || null,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </Section>

          <Section title="Status & IDs">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {JOB_STATUS_OPTIONS.map((opt) => {
                  const active = draft.statuses.includes(opt.value);
                  return (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => toggleStatus(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            {canReview && (
              <>
                <MultiSelectField
                  id="jf-status-codes"
                  label="Status codes"
                  placeholder="All status codes"
                  values={draft.statusCodes}
                  options={(statusCodes.data ?? []).map((code) => ({
                    value: code.code,
                    label: `${code.code} — ${code.description}`,
                  }))}
                  disabled={draft.noStatusCode}
                  onChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      statusCodes: next,
                      noStatusCode: false,
                    }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant={draft.noStatusCode ? "default" : "outline"}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      noStatusCode: !prev.noStatusCode,
                      statusCodes: [],
                    }))
                  }
                >
                  No status code
                </Button>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="jf-ids">Visit IDs</Label>
              <Input
                id="jf-ids"
                value={idsText}
                onChange={(e) => setIdsText(e.target.value)}
                placeholder="e.g. 101, 102"
              />
            </div>
          </Section>
        </div>
        <SheetFooter className="gap-2 border-t px-4 py-3 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY_JOBS_FILTER);
              setIdsText("");
              setGroupsText("");
            }}
          >
            Reset
          </Button>
          <Button type="submit">Apply filters</Button>
        </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
