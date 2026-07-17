"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/shared/components/loading-state";
import { getPagesForRole, isKnownPage } from "@/shared/constants/pages";
import { useSessionStore } from "@/stores/session-store";

/**
 * Client-side route guard. Waits for the persisted session to hydrate, then
 * redirects to /login when there is none. Also ports Angular's `PageGuard`
 * (`PageService.canActivate`): a registered page id outside the role's
 * catalog (or behind a disabled feature flag) redirects to /dashboard, the
 * Angular `**` fallback. Guards are UX only — the API remains the
 * enforcement point for authorization.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((state) => state.session);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  const slug = pathname.split("/")[1] ?? "";
  const pageAllowed =
    !session ||
    !isKnownPage(slug) ||
    getPagesForRole(session.user.role).some((page) => page.id === slug);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!session) {
      router.replace("/login");
    } else if (!pageAllowed) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, session, pageAllowed, router]);

  if (!hasHydrated || !session || !pageAllowed) {
    return <LoadingState label="Loading your session…" fullScreen />;
  }

  return <>{children}</>;
}
