import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Transient UI state (sidebar, dialogs, palette). Never server data. */
interface UiState {
  /** Mobile navigation drawer visibility. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** Desktop sidenav collapsed to icon rail (Angular 90px). */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  /** Global ⌘/Ctrl+K command palette. */
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: "ph.ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
