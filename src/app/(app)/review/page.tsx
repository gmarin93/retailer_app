import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewView } from "@/features/review/components/review-view";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    // Suspense boundary required by useSearchParams (drill-down filters).
    <Suspense fallback={<LoadingState label="Loading review…" />}>
      <ReviewView />
    </Suspense>
  );
}
