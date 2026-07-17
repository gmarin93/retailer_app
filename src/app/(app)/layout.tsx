import type { ReactNode } from "react";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AppShell } from "@/layouts/app-shell";

/** Every route in this group requires a session and renders inside the shell. */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
