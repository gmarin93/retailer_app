import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Session } from "@/features/auth/schemas";
import { getQueryClient } from "@/shared/lib/query-client";

/**
 * Authentication session state (client state only — server data belongs in
 * TanStack Query). Persisted to localStorage, mirroring the Angular
 * `SessionService`. Clearing the session also wipes the query cache, which is
 * the equivalent of the Angular `StoreService.reset()`-on-logout behavior.
 *
 * NOTE: localStorage persistence matches the current app's security posture.
 * Moving to httpOnly cookie sessions is planned (see MIGRATION_PLAN.md) and
 * only requires replacing this store's persistence + the client auth header.
 */

/** Prevents duplicate expiry toasts when several requests 401 at once. */
let expiryHandled = false;

interface SessionState {
  session: Session | null;
  /** True once the persisted session has been read back from localStorage. */
  hasHydrated: boolean;
  setSession: (session: Session) => void;
  /** Explicit user logout. */
  clearSession: () => void;
  /** Token rejected by the API (401): logout with a "session expired" notice. */
  expireSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      hasHydrated: false,

      setSession: (session) => {
        expiryHandled = false;
        set({ session });
      },

      clearSession: () => {
        set({ session: null });
        getQueryClient().clear();
      },

      expireSession: () => {
        if (!get().session) return;
        if (!expiryHandled) {
          expiryHandled = true;
          toast.error("Your session has expired. Please log in again.");
        }
        get().clearSession();
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "cpw.session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
