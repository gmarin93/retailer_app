import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanningView } from "@/features/planning/components/planning-view";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Planning" };

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading planning…" />}>
      <PlanningView />
    </Suspense>
  );
}
