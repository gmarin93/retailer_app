"use client";

import { BellIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parse } from "date-fns";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  useDismissAllReminders,
  useDismissReminder,
  usePendingReminders,
} from "../customer-hooks";

/**
 * Navbar notification bell for customer accounts: badge with the number of
 * due, undismissed reminders across every brand the user owns; dismiss one by
 * one or all at once. Renders nothing for non-customer roles.
 */
export function ReminderBell() {
  const session = useSession();
  const isCustomerAccount = session?.user.role === UserRole.CUSTOMER_ACCOUNT;

  const pending = usePendingReminders(isCustomerAccount);
  const dismiss = useDismissReminder();
  const dismissAll = useDismissAllReminders();

  if (!isCustomerAccount) return null;

  const reminders = pending.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            reminders.length > 0 ? `Reminders (${reminders.length} pending)` : "Reminders"
          }
          className="relative"
        >
          <HugeiconsIcon icon={BellIcon} aria-hidden="true" className="size-5" />
          {reminders.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white"
            >
              {reminders.length > 9 ? "9+" : reminders.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Reminders
          {reminders.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => dismissAll.mutate()}>
              Dismiss all
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {reminders.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No pending reminders.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{reminder.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parse(reminder.date, "yyyy-MM-dd", new Date()), "MMM d")}
                    {reminder.customer_title ? ` · ${String(reminder.customer_title)}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Dismiss reminder: ${reminder.text}`}
                  className="size-6"
                  onClick={() => dismiss.mutate(reminder.id)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
