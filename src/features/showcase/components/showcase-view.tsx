"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { getCurrentCycle, useCyclesByDate } from "@/shared/services/entities/cycles";
import {
  useCustomersByTitle,
  useReviewableCustomersByTitle,
} from "@/shared/services/entities/customers";
import { ImageCompositionIcon } from "@hugeicons/core-free-icons";
import { useActivePrograms } from "@/shared/services/entities/programs";
import {
  buildShowcaseStores,
  fetchShowcaseJobs,
  fetchShowcasePhotosReport,
  type ShowcaseStore,
} from "../api";

const ALL_PROGRAMS = "all";

const showcaseKeys = {
  all: ["showcase"] as const,
  stores: (scope: { customerId: number | null; cycleId: number | null; programId?: number }) =>
    [...showcaseKeys.all, "stores", scope] as const,
};

/**
 * Proof-of-Execution showcase (customer portal, feature-flagged): execution
 * hero, per-store photo grid, and a keyboard-navigable lightbox. Ported from
 * `showcase.component.ts`.
 */
export function ShowcaseView() {
  const session = useSession();
  const isCustomer = session?.user.role === UserRole.CUSTOMER_ACCOUNT;

  const { data: cycles = [] } = useCyclesByDate();
  // Brands: reviewable scope for portal users, full catalog otherwise.
  const allCustomers = useCustomersByTitle();
  const reviewableBrands = useReviewableCustomersByTitle(isCustomer);
  const brands = (isCustomer ? reviewableBrands.data : allCustomers.data) ?? [];

  const [brandId, setBrandId] = useState<number | null>(null);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<string>(ALL_PROGRAMS);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(true);
  const [lightbox, setLightbox] = useState<{ store: ShowcaseStore; index: number } | null>(
    null,
  );

  // Defaults: first brand + current cycle, derived once data arrives.
  const effectiveBrandId = brandId ?? brands[0]?.id ?? null;
  const effectiveCycleId = cycleId ?? (getCurrentCycle(cycles) ?? cycles[0])?.id ?? null;

  const programs = useActivePrograms(effectiveBrandId, isCustomer);

  const scope = {
    customerId: effectiveBrandId,
    cycleId: effectiveCycleId,
    programId: programId !== ALL_PROGRAMS ? Number(programId) : undefined,
  };

  const storesQuery = useQuery({
    queryKey: showcaseKeys.stores(scope),
    queryFn: async ({ signal }) => {
      const fullScope = { ...scope, customerId: scope.customerId!, cycleId: scope.cycleId! };
      const [jobs, photoReports] = await Promise.all([
        fetchShowcaseJobs(fullScope, signal).catch(() => []),
        fetchShowcasePhotosReport(fullScope, signal).catch(() => []),
      ]);
      return buildShowcaseStores(jobs, photoReports);
    },
    enabled: scope.customerId !== null && scope.cycleId !== null,
  });

  const stores = storesQuery.data ?? [];
  const visibleStores = onlyWithPhotos ? stores.filter((s) => s.photos.length > 0) : stores;
  const storesVisited = stores.filter((s) => s.completed).length;
  const photosCount = stores.reduce((sum, s) => sum + s.photos.length, 0);
  const visitsCompleted = stores.reduce((sum, s) => sum + s.visitCount, 0);
  const executionRate =
    stores.length > 0 ? Math.round((storesVisited / stores.length) * 100) : 0;

  const brandLabel = brands.find((b) => b.id === effectiveBrandId)?.title ?? "your stores";

  // Lightbox keyboard controls (arrows + escape), ported from the HostListener.
  useEffect(() => {
    if (!lightbox) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        setLightbox((current) => {
          if (!current) return current;
          const total = current.store.photos.length;
          return { ...current, index: (current.index + delta + total) % total };
        });
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [lightbox]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proof of Execution"
        description={`What was executed in ${brandLabel}'s stores this cycle.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={effectiveBrandId === null ? undefined : String(effectiveBrandId)}
          onValueChange={(value) => {
            setBrandId(Number(value));
            setProgramId(ALL_PROGRAMS);
          }}
        >
          <SelectTrigger size="sm" aria-label="Brand" className="min-w-40">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger size="sm" aria-label="Program" className="min-w-40">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROGRAMS}>All programs</SelectItem>
            {(programs.data ?? []).map((program) => (
              <SelectItem key={program.id} value={String(program.id)}>
                {program.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={effectiveCycleId === null ? undefined : String(effectiveCycleId)}
          onValueChange={(value) => setCycleId(Number(value))}
        >
          <SelectTrigger size="sm" aria-label="Cycle" className="min-w-36">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={String(cycle.id)}>
                {cycle.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyWithPhotos}
            onChange={() => setOnlyWithPhotos((v) => !v)}
            className="size-4"
          />
          Only stores with photos
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Execution rate", value: `${executionRate}%` },
          { label: "Stores visited", value: `${storesVisited} / ${stores.length}` },
          { label: "Visits completed", value: String(visitsCompleted) },
          { label: "Photos captured", value: String(photosCount) },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent>
              <p className="text-2xl font-semibold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {storesQuery.isLoading ? (
        <LoadingState label="Loading execution proof…" className="min-h-60" />
      ) : visibleStores.length === 0 ? (
        <EmptyState
          icon={ImageCompositionIcon}
          title="Nothing to show yet"
          description="No executed visits with photos match the selected brand, program, and cycle."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStores.map((store) => (
            <Card key={store.storeId} className="overflow-hidden">
              {store.photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLightbox({ store, index: 0 })}
                  className="block"
                  aria-label={`Open photos for ${store.retailer} #${store.storeNo}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.photos[0]!.url}
                    alt={`${store.retailer} #${store.storeNo}`}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                </button>
              )}
              <CardContent className="space-y-1">
                <p className="font-medium">
                  {store.retailer} #{store.storeNo}
                </p>
                <p className="truncate text-sm text-muted-foreground">{store.title}</p>
                <p className="text-xs text-muted-foreground">
                  {store.lastVisit
                    ? `Last visit ${store.lastVisit.toLocaleDateString()}`
                    : "Not visited yet"}
                  {store.photos.length > 0 ? ` · ${store.photos.length} photo(s)` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
        >
          <div className="flex w-full max-w-4xl items-center justify-between text-white">
            <p className="text-sm">
              {lightbox.store.retailer} #{lightbox.store.storeNo} — {lightbox.index + 1} /{" "}
              {lightbox.store.photos.length}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close photo viewer"
              className="text-white hover:bg-white/10"
              onClick={() => setLightbox(null)}
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-5" />
            </Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.store.photos[lightbox.index]!.url}
            alt={lightbox.store.photos[lightbox.index]!.filename}
            className="max-h-[75vh] max-w-full rounded-md object-contain"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous photo"
              className="text-white hover:bg-white/10"
              onClick={() =>
                setLightbox((current) =>
                  current
                    ? {
                        ...current,
                        index:
                          (current.index - 1 + current.store.photos.length) %
                          current.store.photos.length,
                      }
                    : current,
                )
              }
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next photo"
              className="text-white hover:bg-white/10"
              onClick={() =>
                setLightbox((current) =>
                  current
                    ? {
                        ...current,
                        index: (current.index + 1) % current.store.photos.length,
                      }
                    : current,
                )
              }
            >
              <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
