import type { Page } from "@/shared/constants/pages";
import type { PaletteItem, RecentItem } from "./types";

const MAX_RECENTS = 8;

function recentKey(userId: number): string {
  return `cmdk:recent:${userId}`;
}

export function loadRecents(userId: number): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(recentKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(userId: number, item: RecentItem): void {
  if (typeof window === "undefined") return;
  const prev = loadRecents(userId).filter((entry) => entry.id !== item.id);
  const next = [item, ...prev].slice(0, MAX_RECENTS);
  localStorage.setItem(recentKey(userId), JSON.stringify(next));
}

export function pageItems(pages: Page[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  return pages
    .filter((page) => !q || page.title.toLowerCase().includes(q) || page.id.includes(q))
    .map((page) => ({
      id: `page-${page.id}`,
      group: "Pages" as const,
      title: page.title,
      subtitle: "Go to page",
      href: `/${page.id}`,
    }));
}

export function actionItems(query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (q && !"log out".includes(q) && !"logout".includes(q)) return [];
  return [
    {
      id: "action-logout",
      group: "Actions",
      title: "Log out",
      subtitle: "End your session",
      action: "logout",
    },
  ];
}

export function recentItems(userId: number, query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  return loadRecents(userId)
    .filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subtitle?.toLowerCase().includes(q) ?? false),
    )
    .map((item) => ({
      id: item.id,
      group: "Recent" as const,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
    }));
}

/** Prefer Review for jobs when the role has it, else Itinerary, else Archives. */
export function jobTargetFromPages(pages: Page[]): "review" | "itinerary" | "archives" | null {
  const ids = new Set(pages.map((p) => p.id));
  if (ids.has("review")) return "review";
  if (ids.has("itinerary")) return "itinerary";
  if (ids.has("archives")) return "archives";
  return null;
}

export function pageIds(pages: Page[]): Set<string> {
  return new Set(pages.map((p) => p.id));
}
