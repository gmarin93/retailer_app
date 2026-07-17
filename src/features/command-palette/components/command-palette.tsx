"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLogout, useSession } from "@/features/auth/hooks";
import { getPagesForRole } from "@/shared/constants/pages";
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
import type { PaletteItem } from "../types";
import { pushRecent } from "../utils";

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

  // Keep the highlight in range when results shrink.
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search pages and records</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <HugeiconsIcon icon={Search01Icon} className="size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages, visits, stores…"
            className="border-0 shadow-none focus-visible:ring-0"
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
        </div>
        <div id={listId} role="listbox" className="max-h-80 overflow-auto p-2">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {searching ? "Searching…" : "No results"}
            </p>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{group}</p>
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
                            "flex w-full flex-col rounded-md px-2 py-2 text-left text-sm",
                            active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runItem(item)}
                        >
                          <span className="font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          ↑↓ navigate · Enter open · Esc close
          {searching ? " · Searching…" : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
}
