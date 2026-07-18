/** Theme preference persisted in localStorage (user choice). */
export type ThemePreference = "light" | "dark" | "system";

/** Concrete theme applied to the document. */
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ph.theme";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

/** Resolve a stored preference against the OS color scheme. */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }
  return preference;
}

/** Read the OS prefers-color-scheme flag (SSR-safe). */
export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply the resolved theme to `<html>` (class + color-scheme). */
export function applyDocumentTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Briefly enable CSS color transitions while switching themes.
 * Honors prefers-reduced-motion via the base stylesheet override.
 */
export function runThemeTransition(durationMs = 220): void {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  window.setTimeout(() => {
    root.classList.remove("theme-transition");
  }, durationMs);
}

/**
 * Public FOUC bootstrap script (`/theme-init.js`). Keep the storage key there
 * identical to `THEME_STORAGE_KEY`.
 */
export const THEME_INIT_SCRIPT_SRC = "/theme-init.js";

/** Recharts axis / grid / tooltip styles bound to CSS design tokens. */
export const chartTheme = {
  gridStroke: "var(--border)",
  tickFill: "var(--muted-foreground)",
  tooltip: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--popover-foreground)",
    boxShadow: "var(--shadow-card)",
  },
} as const;
