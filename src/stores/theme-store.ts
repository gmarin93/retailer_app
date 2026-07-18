import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/shared/lib/theme";

interface ThemeState {
  /** User-selected preference (light / dark / follow OS). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Persisted theme preference. Document class sync lives in ThemeProvider
 * so this store stays a thin client-state slice.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ preference: state.preference }),
    },
  ),
);
