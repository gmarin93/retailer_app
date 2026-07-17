"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { EyeIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
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

/**
 * Grant / lookup / revoke customer-visit access for external users.
 * Ported from `CustomerVisitsPermission` (not a permissions matrix).
 */
export function CustomerVisitsView() {
  const [level, setLevel] = useState<AccessLevel>("Owner");
  const [customerId, setCustomerId] = useState<string>("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ListableUser | null>(null);
  const [lookupArmed, setLookupArmed] = useState(false);
  const [revokeId, setRevokeId] = useState<number | null>(null);

  const usersQuery = useCustomerVisitsUsers();
  const customersQuery = useCustomerVisitsCustomers();
  const matchesQuery = useCustomerVisitMatches(
    level,
    selectedUser?.id ?? null,
    lookupArmed,
  );
  const grant = useGrantCustomerVisitAccess();
  const revoke = useRevokeCustomerVisitAccess();

  const userSuggestions = useMemo(
    () => filterUsers(usersQuery.data ?? [], userQuery),
    [usersQuery.data, userQuery],
  );

  const onGrant = () => {
    if (!selectedUser || !customerId) {
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
    if (!selectedUser) {
      toast.error("Select a user first");
      return;
    }
    setLookupArmed(true);
    void matchesQuery.refetch();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Customer Visits Access"
        description="Grant external users permission to view visits for their customer accounts."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "1. Choose access level",
          "2. Pick the customer",
          "3. Find the user",
          "4. Grant or review access",
        ].map((step) => (
          <Card key={step}>
            <CardContent className="pt-4 text-sm text-muted-foreground">{step}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grant access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-level">
              Access level
            </label>
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v as AccessLevel);
                setLookupArmed(false);
              }}
            >
              <SelectTrigger id="cv-level">
                <SelectValue />
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-customer">
              Customer
            </label>
            <Select value={customerId || undefined} onValueChange={setCustomerId}>
              <SelectTrigger id="cv-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {(customersQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code ? `${c.title} (${c.code})` : c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-user">
              User
            </label>
            <Input
              id="cv-user"
              value={selectedUser ? formatUserLabel(selectedUser) : userQuery}
              onChange={(e) => {
                setSelectedUser(null);
                setLookupArmed(false);
                setUserQuery(e.target.value);
              }}
              placeholder="Search by name, username, or rep #"
              autoComplete="off"
            />
            {!selectedUser && userQuery.trim() && (
              <ul className="max-h-48 overflow-auto rounded-md border bg-popover text-sm shadow-sm">
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

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onLookup}>
              See who has access
            </Button>
            <Button
              type="button"
              onClick={onGrant}
              disabled={grant.isPending}
            >
              {grant.isPending ? "Granting…" : "Grant access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Users with access</CardTitle>
          {lookupArmed && matchesQuery.data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {matchesQuery.data.length}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {!lookupArmed ? (
            <EmptyState
              icon={EyeIcon}
              title="No lookup yet"
              description="Select a user and access level, then use See who has access or Grant access."
            />
          ) : matchesQuery.isLoading ? (
            <LoadingState label="Loading…" />
          ) : (matchesQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={EyeIcon}
              title="No access records"
              description="This user has no grants at the selected access level."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchesQuery.data!.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums">{row.id}</TableCell>
                    <TableCell>{row.customerTitle}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeId(row.id)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
          if (revokeId == null || !selectedUser) return;
          const matchId = revokeId;
          revoke.mutate({ level, matchId, userId: selectedUser.id });
        }}
      />
    </div>
  );
}
