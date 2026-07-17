"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";
import { login } from "./api";
import type { Session } from "./schemas";
import { initialRouteForRole } from "./types";

/** Current session (null while logged out). */
export function useSession(): Session | null {
  return useSessionStore((state) => state.session);
}

/**
 * Login mutation: authenticates, persists the session, and navigates to the
 * role-specific landing page (same behavior as the Angular `SessionService`).
 */
export function useLogin() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session);
      router.replace(initialRouteForRole(session.user.role));
    },
  });
}

/** Clears the session (and the whole query cache) and returns to the login page. */
export function useLogout() {
  const router = useRouter();
  const clearSession = useSessionStore((state) => state.clearSession);

  return () => {
    clearSession();
    router.replace("/login");
  };
}
