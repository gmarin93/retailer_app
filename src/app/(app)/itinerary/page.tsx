import type { Metadata } from "next";
import { Suspense } from "react";
import { ItineraryView } from "@/features/itinerary/components/itinerary-view";
import { LoadingState } from "@/shared/components/loading-state";

export const metadata: Metadata = { title: "Itinerary" };

export default function ItineraryPage() {
  return (
    // Suspense boundary required by useSearchParams (deep link `?job=`).
    <Suspense fallback={<LoadingState label="Loading itinerary…" />}>
      <ItineraryView />
    </Suspense>
  );
}
