import type { Metadata } from "next";
import { Suspense } from "react";
import { EntityManagerPage } from "@/features/entities/components/entity-manager-page";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    // Suspense boundary required by useSearchParams (command-palette ?q=).
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <EntityManagerPage entityKey="users" />
    </Suspense>
  );
}
