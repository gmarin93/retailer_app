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
 * Inlined FOUC bootstrap — runs before React hydrates to avoid a flash of the
 * wrong theme. Keep the storage key in sync with `THEME_STORAGE_KEY` above.
 * Static export cannot use next/script beforeInteractive (no server), so this
 * is rendered via dangerouslySetInnerHTML directly in <head>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var key="ph.theme";var preference="system";var raw=localStorage.getItem(key);if(raw){var data=JSON.parse(raw);var stored=data&&data.state&&data.state.preference;if(stored==="light"||stored==="dark"||stored==="system"){preference=stored;}}var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=preference==="system"?(prefersDark?"dark":"light"):preference;var root=document.documentElement;if(resolved==="dark")root.classList.add("dark");else root.classList.remove("dark");root.style.colorScheme=resolved;}catch(e){}})();`;

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
