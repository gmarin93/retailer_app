"use client";

import { useMemo, useState } from "react";
import {
  Building01Icon,
  Delete02Icon,
  InformationCircleIcon,
  Search01Icon,
  SquareUnlock01Icon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import {
  filterUsers,
  formatUserLabel,
  useCustomerVisitMatches,
  useCustomerVisitsCustomers,
  useCustomerVisitsUsers,
  useGrantCustomerVisitAccess,
  useRevokeCustomerVisitAccess,
} from "../hooks";
import { ACCESS_LEVELS, type AccessLevel, type ListableUser } from "../schemas";

const STEPS: {
  n: number;
  title: string;
  hint: string;
  cta?: boolean;
}[] = [
  {
    n: 1,
    title: "Pick an access level",
    hint: "Owner, Manager, or Supervisor",
  },
  {
    n: 2,
    title: "Choose a customer",
    hint: "The account whose visits will be visible",
  },
  {
    n: 3,
    title: "Find the user",
    hint: "Type a rep number or @username",
  },
  {
    n: 4,
    title: "Grant access",
    hint: "Or review who already has access",
    cta: true,
  },
];

/**
 * Grant / lookup / revoke customer-visit access for external users.
 * Ported from `CustomerVisitsPermission` (not a permissions matrix).
 */
export function CustomerVisitsView() {
  const [level, setLevel] = useState<AccessLevel | "">("");
  const [customerId, setCustomerId] = useState<string>("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ListableUser | null>(null);
  const [lookupArmed, setLookupArmed] = useState(false);
  const [revokeId, setRevokeId] = useState<number | null>(null);

  const usersQuery = useCustomerVisitsUsers();
  const customersQuery = useCustomerVisitsCustomers();
  const matchesQuery = useCustomerVisitMatches(
    level || null,
    selectedUser?.id ?? null,
    lookupArmed && Boolean(level),
  );
  const grant = useGrantCustomerVisitAccess();
  const revoke = useRevokeCustomerVisitAccess();

  const userSuggestions = useMemo(
    () => filterUsers(usersQuery.data ?? [], userQuery),
    [usersQuery.data, userQuery],
  );

  const rows = lookupArmed ? (matchesQuery.data ?? []) : [];
  const busy =
    grant.isPending || (lookupArmed && matchesQuery.isFetching && !matchesQuery.data);
  const progressLabel = grant.isPending
    ? "Granting Access..."
    : lookupArmed && matchesQuery.isFetching
      ? "Loading..."
      : null;

  const onGrant = () => {
    if (!level || !selectedUser || !customerId) {
      toast.error("Select an access level, customer, and user first");
      return;
    }
    setLookupArmed(true);
    grant.mutate(
      {
        level,
        userId: selectedUser.id,
        customerId: Number(customerId),
      },
      {
        onSuccess: () => {
          void matchesQuery.refetch();
        },
      },
    );
  };

  const onLookup = () => {
    if (!level) {
      toast.error("Select an access level first");
      return;
    }
    if (!selectedUser) {
      toast.error("Select a user first");
      return;
    }
    setLookupArmed(true);
    void matchesQuery.refetch();
  };

  return (
    <TooltipProvider>
      <div className="relative flex h-full min-h-0 flex-col bg-[#f5f7fa] dark:bg-background">
        <div className="mx-auto box-border flex w-full max-w-[1800px] flex-1 flex-col gap-3 px-4 py-4 md:px-8 md:py-5">
          {/* Page header */}
          <div className="flex shrink-0 flex-row items-center gap-3">
            <h2 className="m-0 text-2xl font-bold tracking-tight text-foreground">
              Customer Visits Access
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-[#4c6fff] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40"
                  aria-label="About Customer Visits Access"
                >
                  <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Grant external users permission to view visits for their customer accounts.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* How it works */}
          <div className="flex shrink-0 flex-row flex-wrap items-stretch gap-2">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className={cn(
                  "flex min-w-[200px] flex-[1_1_220px] flex-row items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-border dark:bg-card",
                  step.cta &&
                    "border-[rgba(76,111,255,0.18)] bg-linear-to-br from-[#eef2ff] to-[#e0eaff] dark:from-[#1e2540] dark:to-[#1a2240]",
                )}
              >
                <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4c6fff] text-[13px] font-bold text-white">
                  {step.n}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-[13px] font-semibold leading-tight text-slate-900/90 dark:text-foreground">
                    {step.title}
                  </div>
                  <div className="text-[11.5px] leading-snug text-slate-900/60 dark:text-muted-foreground">
                    {step.hint}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="flex shrink-0 flex-col gap-3.5 rounded-[14px] border border-black/[0.06] bg-white px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold tracking-wide text-slate-900/75 dark:text-muted-foreground" htmlFor="cv-level">
                  Access level<span className="ml-0.5 text-[#e85a3a]">*</span>
                </label>
                <Select
                  value={level || ""}
                  onValueChange={(v) => {
                    setLevel(v as AccessLevel);
                    setLookupArmed(false);
                  }}
                >
                  <SelectTrigger
                    id="cv-level"
                    className="h-11 w-full rounded-[10px] border-slate-900/12 bg-white dark:bg-background"
                  >
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold tracking-wide text-slate-900/75 dark:text-muted-foreground" htmlFor="cv-customer">
                  Customer<span className="ml-0.5 text-[#e85a3a]">*</span>
                </label>
                <div className="relative">
                  <Select value={customerId || ""} onValueChange={setCustomerId}>
                    <SelectTrigger
                      id="cv-customer"
                      className="h-11 w-full rounded-[10px] border-slate-900/12 bg-white pr-10 dark:bg-background"
                    >
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customersQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.code ? `${c.title} (${c.code})` : c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <HugeiconsIcon
                    icon={Building01Icon}
                    size={18}
                    strokeWidth={1.7}
                    className="pointer-events-none absolute top-1/2 right-8 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex min-w-[260px] flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold tracking-wide text-slate-900/75 dark:text-muted-foreground" htmlFor="cv-user">
                  User<span className="ml-0.5 text-[#e85a3a]">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="cv-user"
                    value={selectedUser ? formatUserLabel(selectedUser) : userQuery}
                    onChange={(e) => {
                      setSelectedUser(null);
                      setLookupArmed(false);
                      setUserQuery(e.target.value);
                    }}
                    placeholder="Type a rep number or @username"
                    autoComplete="off"
                    className="h-11 rounded-[10px] border-slate-900/12 bg-white pr-10 dark:bg-background"
                  />
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={18}
                    strokeWidth={1.7}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
                {!selectedUser && userQuery.trim() && (
                  <ul className="max-h-48 overflow-auto rounded-[10px] border border-slate-900/10 bg-popover text-sm shadow-sm">
                    {usersQuery.isLoading ? (
                      <li className="px-3 py-2 text-muted-foreground">Loading users…</li>
                    ) : userSuggestions.length === 0 ? (
                      <li className="px-3 py-2 text-muted-foreground">No matches</li>
                    ) : (
                      userSuggestions.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserQuery("");
                              setLookupArmed(false);
                            }}
                          >
                            {formatUserLabel(user)}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-2 pt-0.5">
              <div className="flex-1" />
              <button
                type="button"
                onClick={onLookup}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[#4c6fff] bg-white px-5 text-[13px] font-semibold tracking-wide text-[#4c6fff] transition-colors hover:bg-[rgba(76,111,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35 dark:bg-transparent"
              >
                <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
                <span>See who has access</span>
              </button>
              <button
                type="button"
                onClick={onGrant}
                disabled={grant.isPending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-transparent bg-[#4c6fff] px-5 text-[13px] font-semibold tracking-wide text-white shadow-[0_1px_3px_rgba(76,111,255,0.25)] transition-colors hover:bg-[#3a5cf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
                <span>{grant.isPending ? "Granting…" : "Grant access"}</span>
              </button>
            </div>
          </div>

          {/* Results table card */}
          <div
            className={cn(
              "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card",
              progressLabel && "opacity-60",
            )}
          >
            <div className="flex shrink-0 flex-row items-center gap-2 border-b border-slate-900/[0.06] px-5 py-3.5 dark:border-border">
              <span className="text-sm font-bold text-slate-900/90 dark:text-foreground">
                Users with access
              </span>
              {rows.length > 0 && (
                <span className="inline-flex items-center rounded-[10px] bg-[#eef2ff] px-2.5 py-0.5 text-xs font-bold text-[#4c6fff] dark:bg-[#1e2540]">
                  {rows.length}
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                  <HugeiconsIcon
                    icon={SquareUnlock01Icon}
                    size={44}
                    strokeWidth={1.4}
                    className="mb-2.5 text-slate-900/25 dark:text-muted-foreground/40"
                  />
                  <p className="m-0 mb-1 text-[14.5px] font-semibold text-slate-900/75 dark:text-foreground">
                    Nothing to show yet
                  </p>
                  <p className="m-0 max-w-[480px] text-[13px] leading-relaxed text-slate-900/55 dark:text-muted-foreground">
                    Fill in the form above and click{" "}
                    <strong className="font-semibold text-[#4c6fff]">See who has access</strong>{" "}
                    to look up existing grants, or{" "}
                    <strong className="font-semibold text-[#4c6fff]">Grant access</strong> to
                    create a new one.
                  </p>
                </div>
              ) : (
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-[1]">
                    <tr>
                      <th className="bg-[#eef2ff] px-5 py-3 text-[12.5px] font-bold tracking-wide text-[#243060] dark:bg-[#1e2540] dark:text-foreground">
                        ID
                      </th>
                      <th className="bg-[#eef2ff] px-5 py-3 text-[12.5px] font-bold tracking-wide text-[#243060] dark:bg-[#1e2540] dark:text-foreground">
                        Customer
                      </th>
                      <th className="bg-[#eef2ff] px-5 py-3 text-[12.5px] font-bold tracking-wide text-[#243060] dark:bg-[#1e2540] dark:text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-[rgba(76,111,255,0.035)] dark:hover:bg-accent/40"
                      >
                        <td className="border-b border-slate-900/[0.05] px-5 py-[12px] text-[13.5px] tabular-nums text-slate-900/90 dark:border-border dark:text-foreground">
                          {row.id}
                        </td>
                        <td className="border-b border-slate-900/[0.05] px-5 py-[12px] text-[13.5px] text-slate-900/90 dark:border-border dark:text-foreground">
                          {row.customerTitle}
                        </td>
                        <td className="border-b border-slate-900/[0.05] px-5 py-[12px] dark:border-border">
                          <button
                            type="button"
                            onClick={() => setRevokeId(row.id)}
                            aria-label="Revoke access"
                            title="Revoke access"
                            className="inline-flex size-[34px] items-center justify-center rounded-lg bg-[#e85a3a] text-white transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e85a3a]/40"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {busy && progressLabel && (
              <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-[rgba(245,247,250,0.7)] backdrop-blur-[1px] dark:bg-background/70">
                <div className="size-10 animate-spin rounded-full border-2 border-[#4c6fff]/25 border-t-[#4c6fff]" />
                <span className="text-[13.5px] font-medium text-slate-900/70 dark:text-muted-foreground">
                  {progressLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={revokeId != null}
          onOpenChange={(open) => {
            if (!open) setRevokeId(null);
          }}
          title="User Customer Visits Access"
          question="Are you sure you want to remove the access?"
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            if (revokeId == null || !selectedUser || !level) return;
            const matchId = revokeId;
            revoke.mutate({ level, matchId, userId: selectedUser.id });
          }}
        />
      </div>
    </TooltipProvider>
  );
}
