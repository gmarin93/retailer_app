"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPlanDocuments } from "./api";
import {
  createReminder,
  dismissAllReminders,
  dismissReminder,
  fetchCalendarSummaries,
  fetchPendingReminders,
  fetchHoursByClient,
  fetchMonthlyCompleteHours,
  fetchReminders,
  fetchReviewableCustomersByTitle,
  type ReminderCreate,
} from "./customer-api";
import { PLAN_DOCUMENTS_PREVIEW_LIMIT, type DashboardReminder } from "./schemas";

export const customerDashboardKeys = {
  all: ["customer-dashboard"] as const,
  customers: () => [...customerDashboardKeys.all, "customers"] as const,
  monthlyHours: (customerId: number | null, year: number) =>
    [...customerDashboardKeys.all, "monthly-hours", { customerId, year }] as const,
  hoursByClient: (customerIds: number[], year: number) =>
    [...customerDashboardKeys.all, "hours-by-client", { customerIds, year }] as const,
  planDocuments: (customerId: number | null) =>
    [...customerDashboardKeys.all, "plan-documents", { customerId }] as const,
  planDocumentsAll: (customerId: number | null) =>
    [...customerDashboardKeys.all, "plan-documents-all", { customerId }] as const,
  calendar: (customerId: number | null, from: string, to: string) =>
    [...customerDashboardKeys.all, "calendar", { customerId, from, to }] as const,
  reminders: (customerId: number | null, from: string, to: string) =>
    [...customerDashboardKeys.all, "reminders", { customerId, from, to }] as const,
};

/** Assigned clients for the customer account (defaults chart to the first). */
export function useReviewableCustomers() {
  return useQuery({
    queryKey: customerDashboardKeys.customers(),
    queryFn: ({ signal }) => fetchReviewableCustomersByTitle(signal),
    staleTime: 5 * 60_000,
  });
}

export function useMonthlyCompleteHours(customerId: number | null, year: number) {
  return useQuery({
    queryKey: customerDashboardKeys.monthlyHours(customerId, year),
    queryFn: ({ signal }) => fetchMonthlyCompleteHours(customerId!, year, signal),
    enabled: customerId !== null,
  });
}

export function useHoursByClient(customerIds: number[], year: number) {
  return useQuery({
    queryKey: customerDashboardKeys.hoursByClient(customerIds, year),
    queryFn: ({ signal }) => fetchHoursByClient(customerIds, year, signal),
    enabled: customerIds.length > 0,
  });
}

/** Client-scoped plan documents preview (all cycles, capped). */
export function useCustomerPlanDocuments(customerId: number | null) {
  return useQuery({
    queryKey: customerDashboardKeys.planDocuments(customerId),
    queryFn: ({ signal }) =>
      fetchPlanDocuments(
        { customerId: customerId!, limit: PLAN_DOCUMENTS_PREVIEW_LIMIT },
        signal,
      ),
    enabled: customerId !== null,
  });
}

/** Client-scoped historical list for the "View documents" dialog. */
export function useAllCustomerPlanDocuments(customerId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: customerDashboardKeys.planDocumentsAll(customerId),
    queryFn: ({ signal }) => fetchPlanDocuments({ customerId: customerId! }, signal),
    enabled: enabled && customerId !== null,
    staleTime: 5 * 60_000,
  });
}

export function useCalendarSummaries(
  customerId: number | null,
  rangeFrom: string,
  rangeTo: string,
) {
  return useQuery({
    queryKey: customerDashboardKeys.calendar(customerId, rangeFrom, rangeTo),
    queryFn: ({ signal }) => fetchCalendarSummaries(rangeFrom, rangeTo, customerId!, signal),
    enabled: customerId !== null,
  });
}

export function useReminders(customerId: number | null, rangeFrom: string, rangeTo: string) {
  return useQuery({
    queryKey: customerDashboardKeys.reminders(customerId, rangeFrom, rangeTo),
    queryFn: ({ signal }) =>
      fetchReminders(rangeFrom, rangeTo, customerId ?? undefined, signal),
    enabled: customerId !== null,
  });
}

/**
 * Creates a reminder. On network/permission failure the reminder is still
 * kept locally for the session — ported from `persistReminder`, which shows
 * the reminder even when the POST fails.
 */
export function useCreateReminder(
  customerId: number | null,
  rangeFrom: string,
  rangeTo: string,
) {
  const queryClient = useQueryClient();
  const key = customerDashboardKeys.reminders(customerId, rangeFrom, rangeTo);

  const append = (reminder: DashboardReminder) => {
    queryClient.setQueryData<DashboardReminder[]>(key, (existing) => [
      ...(existing ?? []),
      reminder,
    ]);
  };

  return useMutation({
    mutationFn: (payload: ReminderCreate) => createReminder(payload),
    // A reminder set for today (or earlier) is immediately "due", so the
    // navbar bell should pick it up without waiting for the next poll.
    onSettled: () => queryClient.invalidateQueries({ queryKey: reminderBellKeys.pending() }),
    onSuccess: (reminder) => append(reminder),
    onError: (_error, payload) => {
      append({
        id: Date.now(),
        customer: payload.customer,
        date: payload.date,
        text: payload.text,
        created_at: new Date().toISOString(),
      });
      toast.warning("Reminder saved locally — it could not be stored on the server.");
    },
  });
}

// -- Reminder bell ----------------------------------------------------------

/** How often the bell re-checks for due reminders while mounted. */
const REMINDER_POLL_INTERVAL_MS = 60_000;

export const reminderBellKeys = {
  pending: () => [...customerDashboardKeys.all, "pending-reminders"] as const,
};

/**
 * Due, undismissed reminders for the navbar bell (customer accounts only —
 * the caller gates on role). Polls while mounted, like the Angular service.
 */
export function usePendingReminders(enabled: boolean) {
  return useQuery({
    queryKey: reminderBellKeys.pending(),
    queryFn: ({ signal }) => fetchPendingReminders(signal),
    enabled,
    refetchInterval: REMINDER_POLL_INTERVAL_MS,
  });
}

/** Optimistically removes one reminder from the bell, then persists. */
export function useDismissReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismissReminder(id),
    onMutate: (id) => {
      queryClient.setQueryData<DashboardReminder[]>(reminderBellKeys.pending(), (existing) =>
        (existing ?? []).filter((r) => r.id !== id),
      );
    },
  });
}

/** Optimistically clears the bell, then calls the bulk-dismiss API. */
export function useDismissAllReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dismissAllReminders(),
    onMutate: () => {
      queryClient.setQueryData<DashboardReminder[]>(reminderBellKeys.pending(), []);
    },
  });
}
