"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import {
  applyDocumentTheme,
  getSystemPrefersDark,
  resolveTheme,
  runThemeTransition,
  type ResolvedTheme,
} from "@/shared/lib/theme";
import { useThemeStore } from "@/stores/theme-store";

function subscribeSystemTheme(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onStoreChange();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}

function getSystemSnapshot(): boolean {
  return getSystemPrefersDark();
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribeThemeHydration(onStoreChange: () => void): () => void {
  if (useThemeStore.persist.hasHydrated()) {
    return () => {};
  }
  return useThemeStore.persist.onFinishHydration(onStoreChange);
}

function getThemeHydrationSnapshot(): boolean {
  return useThemeStore.persist.hasHydrated();
}

/** Resolved theme for the current preference + OS setting. */
export function useResolvedTheme(): ResolvedTheme {
  const preference = useThemeStore((state) => state.preference);
  const prefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemSnapshot,
    getServerSnapshot,
  );
  return resolveTheme(preference, prefersDark);
}

/**
 * Keeps `<html class="dark">` in sync with the theme store and OS preference.
 * Pair with `themeInitScript` in the root layout to avoid flash of wrong theme.
 *
 * Document updates wait until Zustand persist has rehydrated so the default
 * `system` preference cannot briefly override a stored light/dark choice.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((state) => state.preference);
  const resolved = useResolvedTheme();
  const hydrated = useSyncExternalStore(
    subscribeThemeHydration,
    getThemeHydrationSnapshot,
    () => false,
  );
  const previousPreference = useRef<typeof preference | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (
      previousPreference.current !== null &&
      previousPreference.current !== preference
    ) {
      runThemeTransition();
    }
    previousPreference.current = preference;
    applyDocumentTheme(resolved);
  }, [hydrated, preference, resolved]);

  return children;
}
