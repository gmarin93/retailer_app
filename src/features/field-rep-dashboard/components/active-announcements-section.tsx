"use client";

import { useState } from "react";
import { Megaphone01Icon, AlertCircleIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/shared/lib/utils";
import { useActiveAnnouncements, useMarkAnnouncementRead } from "../hooks";
import type { ActiveAnnouncement } from "../schemas";

const MAX_VISIBLE = 3;

const SESSION_DISMISSED = new Set<number>();

function accentColor(priority: string): string {
  if (priority === "critical") return "#C62828";
  if (priority === "high") return "#EF6C00";
  return "#546EF6";
}

function AnnouncementCard({
  announcement,
  onDismiss,
  onRead,
}: {
  announcement: ActiveAnnouncement;
  onDismiss: (id: number) => void;
  onRead: (id: number) => void;
}) {
  const isCritical = announcement.priority === "critical";
  const accent = accentColor(announcement.priority);

  return (
    <div
      className="group relative cursor-pointer rounded-xl border p-3 transition-colors hover:bg-accent/40"
      style={{
        borderColor: isCritical ? `${accent}66` : undefined,
        backgroundColor: isCritical ? `${accent}10` : undefined,
      }}
      onClick={() => {
        if (!announcement.is_read) onRead(announcement.id);
      }}
    >
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon
          icon={isCritical ? AlertCircleIcon : Megaphone01Icon}
          className="mt-0.5 size-[18px] shrink-0"
          style={{ color: accent }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm",
                announcement.is_read ? "font-medium" : "font-bold",
                "text-foreground",
              )}
            >
              {announcement.title}
            </span>
            {!announcement.is_read && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
            )}
          </div>
          {announcement.summary && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {announcement.summary}
            </p>
          )}
        </div>
        {!isCritical && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(announcement.id);
            }}
            className="invisible shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground group-hover:visible"
            aria-label="Dismiss"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ActiveAnnouncementsSection() {
  const query = useActiveAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const all = query.data ?? [];
  const visible = all
    .filter((a) => !dismissed.has(a.id) && !SESSION_DISMISSED.has(a.id))
    .slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  const unreadCount = visible.filter((a) => !a.is_read).length;

  function dismiss(id: number) {
    SESSION_DISMISSED.add(id);
    setDismissed((prev) => new Set([...prev, id]));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-foreground">Latest Announcements</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            {unreadCount} new
          </span>
        )}
      </div>
      <div className="space-y-2">
        {visible.map((a) => (
          <AnnouncementCard
            key={a.id}
            announcement={a}
            onDismiss={dismiss}
            onRead={(id) => void markRead.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
