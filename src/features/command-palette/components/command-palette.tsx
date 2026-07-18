"use client";

import {
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  ArrowUp01Icon,
  Briefcase01Icon,
  Building01Icon,
  Calendar03Icon,
  Cancel01Icon,
  DashboardSquare01Icon,
  Layers01Icon,
  Logout01Icon,
  ClipboardIcon,
  Search01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLogout, useSession } from "@/features/auth/hooks";
import { getPagesForRole, PAGE_MAP } from "@/shared/constants/pages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useCommandPaletteSearch } from "../hooks";
import type { PaletteGroup, PaletteItem } from "../types";
import { pushRecent } from "../utils";

const GROUP_ICONS: Partial<Record<PaletteGroup, IconSvgElement>> = {
  Jobs: Briefcase01Icon,
  Plans: ClipboardIcon,
  Stores: Store01Icon,
  Reps: UserIcon,
  Customers: Building01Icon,
  Retailers: ShoppingBag01Icon,
  Programs: Layers01Icon,
  Cycles: Calendar03Icon,
  Actions: Logout01Icon,
  Pages: DashboardSquare01Icon,
  Recent: Search01Icon,
};

function itemIcon(item: PaletteItem): IconSvgElement {
  if (item.group === "Pages") {
    const pageId = item.href?.replace(/^\//, "");
    const page = pageId
      ? Object.values(PAGE_MAP).find((entry) => entry.id === pageId)
      : undefined;
    if (page) return page.icon;
  }
  // Recents keep their original entity id (`plan-123`, `job-456`) — use that for icons.
  if (item.group === "Recent") {
    if (item.id.startsWith("plan-")) return ClipboardIcon;
    if (item.id.startsWith("job-")) return Briefcase01Icon;
    if (item.id.startsWith("stores-") || item.id.startsWith("store-")) return Store01Icon;
    if (item.id.startsWith("reps-") || item.id.startsWith("users-")) return UserIcon;
    if (item.id.startsWith("customers-")) return Building01Icon;
    if (item.id.startsWith("retailers-")) return ShoppingBag01Icon;
    if (item.id.startsWith("programs-")) return Layers01Icon;
    if (item.id.startsWith("cycles-")) return Calendar03Icon;
  }
  return GROUP_ICONS[item.group] ?? Search01Icon;
}

/**
 * Global ⌘/Ctrl+K palette: pages, logout, recents, and role-gated entity search.
 * Ported from Angular `CommandPaletteComponent` (without adding the `cmdk` dependency).
 */
export function CommandPalette() {
  const session = useSession();
  const logout = useLogout();
  const router = useRouter();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = session ? getPagesForRole(session.user.role) : [];
  const { items, searching } = useCommandPaletteSearch(query, pages, session?.user.id ?? 0);

  const safeActiveIndex = items.length === 0 ? 0 : Math.min(activeIndex, items.length - 1);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!session) return;
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [session, setOpen]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  const runItem = (item: PaletteItem) => {
    if (item.action === "logout") {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
      logout();
      return;
    }
    if (!item.href || !session) return;
    pushRecent(session.user.id, {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
    });
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    router.push(item.href);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Smart Search</DialogTitle>
          <DialogDescription>Search pages, visits, stores, and plans</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3 py-1">
          <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages, stores, reps, customers…"
            className="h-11 border-0 shadow-none focus-visible:ring-0"
            aria-controls={listId}
            aria-activedescendant={
              items[safeActiveIndex] ? `${listId}-${safeActiveIndex}` : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[safeActiveIndex]) {
                e.preventDefault();
                runItem(items[safeActiveIndex]!);
              }
            }}
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
            esc
          </kbd>
        </div>
        <div id={listId} role="listbox" className="max-h-[28rem] overflow-auto p-2">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {searching ? "Searching…" : "No results found"}
            </p>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group}
                </p>
                <ul>
                  {groupItems.map((item) => {
                    const index = items.indexOf(item);
                    const active = index === safeActiveIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`${listId}-${index}`}
                          role="option"
                          aria-selected={active}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-accent/60",
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runItem(item)}
                        >
                          <span
                            className={cn(
                              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <HugeiconsIcon
                              icon={itemIcon(item)}
                              className="size-4"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{item.title}</span>
                            {item.subtitle ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          {active ? (
                            <HugeiconsIcon
                              icon={ArrowTurnBackwardIcon}
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t px-3 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">
              <HugeiconsIcon icon={ArrowUp01Icon} className="inline size-3" />
            </kbd>
            <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">
              <HugeiconsIcon icon={ArrowDown01Icon} className="inline size-3" />
            </kbd>
            to navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans">↵</kbd>
            to select
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border bg-muted px-1 py-0.5 font-sans">
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </kbd>
            to close
          </span>
          {searching ? <span className="ml-auto">Searching…</span> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
