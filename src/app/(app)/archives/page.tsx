import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchivesView } from "@/features/archives/components/archives-view";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Archives" };

export default function ArchivesPage() {
  return (
    // Suspense boundary required by useSearchParams (deep link `?job=`).
    <Suspense fallback={<LoadingState label="Loading archives…" />}>
      <ArchivesView />
    </Suspense>
  );
}
