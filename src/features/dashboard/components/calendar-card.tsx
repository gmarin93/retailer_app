"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useCalendarSummaries, useCreateReminder, useReminders } from "../customer-hooks";

const ISO_DAY = "yyyy-MM-dd";
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** 6 weeks × 7 days month grid, weeks starting Sunday. */
function monthGrid(viewMonth: Date): Date[][] {
  const start = startOfWeek(startOfMonth(viewMonth));
  const end = endOfWeek(endOfMonth(viewMonth));
  const weeks: Date[][] = [];
  let cursor = start;
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * Customer-portal calendar (Notes 168 / 151 / 173): per-day dots for
 * completed/pending reviews and reminders, a selected-day side panel, and
 * the brand-scoped "Add reminder" flow.
 */
export function CalendarCard({ customerId }: { customerId: number | null }) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const rangeFrom = format(startOfMonth(viewMonth), ISO_DAY);
  const rangeTo = format(endOfMonth(viewMonth), ISO_DAY);
  const summaries = useCalendarSummaries(customerId, rangeFrom, rangeTo);
  const reminders = useReminders(customerId, rangeFrom, rangeTo);
  const createReminder = useCreateReminder(customerId, rangeFrom, rangeTo);

  const reminderForm = useForm<{ text: string }>({ defaultValues: { text: "" } });

  const remindersByDay = new Map<string, number>();
  for (const reminder of reminders.data ?? []) {
    remindersByDay.set(reminder.date, (remindersByDay.get(reminder.date) ?? 0) + 1);
  }

  const selectedKey = format(selectedDay, ISO_DAY);
  const selectedSummary = summaries.data?.[selectedKey];
  const selectedReminders = (reminders.data ?? []).filter((r) => r.date === selectedKey);

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (!isSameMonth(day, viewMonth)) setViewMonth(startOfMonth(day));
  };

  const submitReminder = reminderForm.handleSubmit(({ text }) => {
    if (!customerId) return;
    createReminder.mutate({ customer: customerId, date: selectedKey, text: text.trim() });
    reminderForm.reset();
    setReminderDialogOpen(false);
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Calendar</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          {monthGrid(viewMonth).map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day) => {
                const key = format(day, ISO_DAY);
                const summary = summaries.data?.[key];
                const reminderCount = remindersByDay.get(key) ?? 0;
                const isSelected = isSameDay(day, selectedDay);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDay(day)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors hover:bg-accent",
                      !isSameMonth(day, viewMonth) && "text-muted-foreground/50",
                      isSameDay(day, new Date()) && "font-semibold",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {format(day, "d")}
                    <span className="flex gap-0.5" aria-hidden="true">
                      {(summary?.completeReviews ?? 0) > 0 && (
                        <span className="size-1.5 rounded-full bg-chart-2" />
                      )}
                      {(summary?.reviewsPending ?? 0) > 0 && (
                        <span className="size-1.5 rounded-full bg-chart-3" />
                      )}
                      {reminderCount > 0 && (
                        <span className="size-1.5 rounded-full bg-chart-1" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">{format(selectedDay, "MMMM d")}</h3>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-chart-2" />
              {selectedSummary?.completeReviews ?? 0} complete review
              {(selectedSummary?.completeReviews ?? 0) === 1 ? "" : "s"}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-chart-3" />
              {selectedSummary?.reviewsPending ?? 0} pending review
              {(selectedSummary?.reviewsPending ?? 0) === 1 ? "" : "s"}
            </li>
          </ul>
          {selectedReminders.length > 0 && (
            <ul className="space-y-1">
              {selectedReminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="rounded-md bg-blue-50 px-2 py-1 text-sm text-blue-900"
                >
                  {reminder.text}
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!customerId}
            onClick={() => setReminderDialogOpen(true)}
          >
            Add reminder
          </Button>
        </div>
      </CardContent>

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add reminder</DialogTitle>
            <DialogDescription>{format(selectedDay, "MMMM d, yyyy")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReminder} noValidate>
            <Field data-invalid={!!reminderForm.formState.errors.text || undefined}>
              <FieldLabel htmlFor="reminder-text">Reminder</FieldLabel>
              <Input
                id="reminder-text"
                autoComplete="off"
                aria-invalid={!!reminderForm.formState.errors.text}
                {...reminderForm.register("text", { required: "Enter a reminder" })}
              />
              {reminderForm.formState.errors.text && (
                <FieldError>{reminderForm.formState.errors.text.message}</FieldError>
              )}
            </Field>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReminderDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
