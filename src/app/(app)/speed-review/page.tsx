import type { Metadata } from "next";
import { Suspense } from "react";
import { SpeedReviewView } from "@/features/speed-review/components/speed-review-view";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Speed Review" };

export default function SpeedReviewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading speed review…" />}>
      <SpeedReviewView />
    </Suspense>
  );
}
