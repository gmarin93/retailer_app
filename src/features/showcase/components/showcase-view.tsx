"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Camera01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  Clock01Icon,
  ImageCompositionIcon,
  ImageNotFound01Icon,
  SquareIcon,
  Store01Icon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import { getCurrentCycle, useCyclesByDate } from "@/shared/services/entities/cycles";
import {
  useCustomersByTitle,
  useReviewableCustomersByTitle,
} from "@/shared/services/entities/customers";
import { useActivePrograms } from "@/shared/services/entities/programs";
import { fetchShowcaseStores, type ShowcaseStore } from "../api";

const ALL_PROGRAMS = "all";

const showcaseKeys = {
  all: ["showcase"] as const,
  stores: (scope: { customerId: number | null; cycleId: number | null; programId?: number }) =>
    [...showcaseKeys.all, "stores", scope] as const,
};

/**
 * Proof-of-Execution showcase (customer portal, feature-flagged).
 * Layout and interactions ported from Angular `showcase.component`.
 */
export function ShowcaseView() {
  const session = useSession();
  const isCustomer = session?.user.role === UserRole.CUSTOMER_ACCOUNT;

  const { data: cycles = [] } = useCyclesByDate();
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
    queryFn: ({ signal }) =>
      fetchShowcaseStores(
        { customerId: scope.customerId!, cycleId: scope.cycleId!, programId: scope.programId },
        signal,
      ),
    enabled: scope.customerId !== null && scope.cycleId !== null,
  });

  const stores = storesQuery.data?.stores ?? [];
  const photosFailed = storesQuery.data?.photosFailed ?? false;
  // When the photos report fails, show every store so the page is still useful.
  const filterPhotos = onlyWithPhotos && !photosFailed;
  const visibleStores = filterPhotos ? stores.filter((s) => s.photos.length > 0) : stores;
  const storesVisited = stores.filter((s) => s.completed).length;
  const photosCount = stores.reduce((sum, s) => sum + s.photos.length, 0);
  const visitsCompleted = stores.reduce((sum, s) => sum + s.visitCount, 0);
  const executionRate =
    stores.length > 0 ? Math.round((storesVisited / stores.length) * 100) : 0;

  const brandLabel = brands.find((b) => b.id === effectiveBrandId)?.title ?? "your stores";
  const cycleLabel = cycles.find((c) => c.id === effectiveCycleId)?.title ?? "—";

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

  function openLightbox(store: ShowcaseStore, index = 0) {
    if (store.photos.length === 0) return;
    setLightbox({
      store,
      index: Math.min(Math.max(index, 0), store.photos.length - 1),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7d52ff,#4c6fff)] text-white shadow-[0_6px_16px_rgba(125,82,255,0.32)]"
          >
            <HugeiconsIcon icon={ImageCompositionIcon} className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight text-foreground">
              Proof of Execution
            </h1>
            <p className="mt-0.5 text-[13.5px] text-muted-foreground">
              See exactly what was done in {brandLabel} this cycle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={effectiveBrandId === null ? undefined : String(effectiveBrandId)}
            onValueChange={(value) => {
              setBrandId(Number(value));
              setProgramId(ALL_PROGRAMS);
            }}
          >
            <SelectTrigger aria-label="Brand" className="min-w-[170px] bg-card">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent searchPlaceholder="Search brands…">
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={String(brand.id)}>
                  {brand.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger aria-label="Program" className="min-w-[170px] bg-card">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent searchPlaceholder="Search programs…">
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
            <SelectTrigger aria-label="Cycle" className="min-w-[170px] bg-card">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent searchPlaceholder="Search cycles…" className="max-h-80">
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={String(cycle.id)}>
                  {cycle.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Hero metrics */}
      <section className="flex flex-wrap items-center gap-7 rounded-[14px] border border-border bg-card px-6 py-5 shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
        <div className="flex min-w-60 items-center gap-4.5">
          <ExecutionRing percent={executionRate} />
          <div className="flex flex-col">
            <span className="text-[17px] font-bold text-foreground">Stores executed</span>
            <span className="mt-0.5 text-[12.5px] text-muted-foreground">
              {storesVisited.toLocaleString()} of {stores.length.toLocaleString()} stores · cycle{" "}
              {cycleLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-7">
          <HeroStat
            icon={Store01Icon}
            tone="blue"
            value={storesVisited}
            label="Stores visited"
          />
          <HeroStat
            icon={CheckmarkCircle02Icon}
            tone="green"
            value={visitsCompleted}
            label="Visits completed"
          />
          <HeroStat
            icon={Camera01Icon}
            tone="violet"
            value={photosCount}
            label="Photos captured"
          />
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-foreground">Store gallery</h2>
        <button
          type="button"
          onClick={() => setOnlyWithPhotos((value) => !value)}
          disabled={photosFailed}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            onlyWithPhotos && !photosFailed
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-accent/60",
          )}
        >
          <HugeiconsIcon
            icon={onlyWithPhotos && !photosFailed ? CheckmarkSquare02Icon : SquareIcon}
            className="size-[18px]"
            aria-hidden="true"
          />
          Only stores with photos
        </button>
      </div>

      {photosFailed ? (
        <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13.5px] text-amber-800 dark:text-amber-200">
          Visit metrics loaded, but the photo report failed. Showing stores without photos —{" "}
          <button
            type="button"
            className="font-semibold underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            onClick={() => void storesQuery.refetch()}
          >
            retry loading photos
          </button>
          .
        </div>
      ) : null}

      {/* Gallery */}
      {storesQuery.isLoading ? (
        <LoadingState label="Gathering proof…" className="min-h-60" />
      ) : storesQuery.isError ? (
        <ErrorState error={storesQuery.error} onRetry={() => void storesQuery.refetch()} />
      ) : visibleStores.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2.5 rounded-[14px] border border-dashed border-border bg-card px-5 py-16 text-center text-muted-foreground">
          <HugeiconsIcon icon={ImageCompositionIcon} className="size-11 opacity-60" />
          <h3 className="mt-1.5 text-[17px] font-semibold text-foreground">Nothing to show yet</h3>
          <p className="text-[13.5px]">
            {onlyWithPhotos && photosCount === 0
              ? "No photos for this brand, program, and cycle. Try another cycle (e.g. April 2026) or turn off “Only stores with photos”."
              : "No completed visits with photos for this brand and cycle."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] max-md:gap-3">
          {visibleStores.map((store) => (
            <StoreCard
              key={store.storeId}
              store={store}
              onOpenPhoto={(index) => openLightbox(store, index)}
            />
          ))}
        </div>
      )}

      {lightbox ? (
        <Lightbox
          store={lightbox.store}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onStep={(delta) =>
            setLightbox((current) => {
              if (!current) return current;
              const total = current.store.photos.length;
              return { ...current, index: (current.index + delta + total) % total };
            })
          }
        />
      ) : null}
    </div>
  );
}

function ExecutionRing({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="flex size-[92px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: `radial-gradient(var(--card) 60%, transparent 61%), conic-gradient(var(--primary) ${pct}%, var(--border) 0)`,
      }}
      aria-label={`${pct} percent stores executed`}
    >
      <span className="text-2xl font-extrabold text-foreground">
        {pct}
        <small className="text-xs font-bold text-muted-foreground">%</small>
      </span>
    </div>
  );
}

function HeroStat({
  icon,
  tone,
  value,
  label,
}: {
  icon: IconSvgElement;
  tone: "blue" | "green" | "violet";
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex size-[42px] items-center justify-center rounded-[11px]",
          tone === "blue" && "bg-[#eaeffe] text-[#4c6fff] dark:bg-primary/15 dark:text-primary",
          tone === "green" &&
            "bg-[#e8faf0] text-[#3cd856] dark:bg-emerald-500/15 dark:text-emerald-400",
          tone === "violet" &&
            "bg-[#e9ecfb] text-[#6a7fd4] dark:bg-indigo-400/15 dark:text-indigo-300",
        )}
      >
        <HugeiconsIcon icon={icon} className="size-[22px]" aria-hidden="true" />
      </span>
      <div>
        <div className="text-[22px] leading-tight font-bold text-foreground">
          {value.toLocaleString()}
        </div>
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

interface StoreCardProps {
  store: ShowcaseStore;
  onOpenPhoto: (index: number) => void;
}

function StoreCard({ store, onOpenPhoto }: StoreCardProps) {
  const hasPhotos = store.photos.length > 0;
  const visitLabel = store.lastVisit
    ? store.lastVisit.toLocaleDateString()
    : "Not visited yet";

  return (
    <article className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_2px_8px_rgba(17,24,39,0.06)] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(17,24,39,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_26px_rgba(0,0,0,0.4)]">
      <button
        type="button"
        disabled={!hasPhotos}
        onClick={() => onOpenPhoto(0)}
        aria-label={`Open photos for ${store.retailer} ${store.storeNo}`}
        className="group relative block aspect-[4/3] w-full overflow-hidden bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default"
      >
        {hasPhotos ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store.photos[0]!.url}
              alt={store.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {store.photos.length > 1 ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-[rgba(15,23,42,0.72)] px-2.5 py-0.5 text-xs font-bold text-white">
                +{store.photos.length - 1}
              </span>
            ) : null}
            <span className="absolute top-2 right-2 flex size-[30px] items-center justify-center rounded-lg bg-[rgba(15,23,42,0.55)] text-white opacity-0 transition-opacity group-hover:opacity-100">
              <HugeiconsIcon icon={ZoomInAreaIcon} className="size-[18px]" aria-hidden="true" />
            </span>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
            <HugeiconsIcon icon={ImageNotFound01Icon} className="size-[30px]" aria-hidden="true" />
            <span>No photos</span>
          </div>
        )}
      </button>

      <div className="px-3.5 pt-3 pb-1.5">
        <div className="truncate text-[14.5px] font-bold text-foreground">
          {store.retailer} {store.storeNo}
        </div>
        <div className="truncate text-[12.5px] text-muted-foreground">{store.title}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
              store.completed
                ? "bg-[#e8faf0] text-[#1f9e3c] dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-[#fff1eb] text-[#e06a4f] dark:bg-orange-500/15 dark:text-orange-300",
            )}
          >
            <HugeiconsIcon
              icon={store.completed ? CheckmarkCircle02Icon : Clock01Icon}
              className="size-3.5"
              aria-hidden="true"
            />
            {store.completed ? "Visited" : "Pending"}
          </span>
          <span className="text-[11.5px] text-muted-foreground">{visitLabel}</span>
        </div>
      </div>

      {store.photos.length > 1 ? (
        <div className="grid grid-cols-4 gap-1 px-2.5 pt-2 pb-3">
          {store.photos.slice(1, 5).map((photo, index) => (
            <button
              key={`${photo.url}-${index}`}
              type="button"
              onClick={() => onOpenPhoto(index + 1)}
              aria-label={`Open photo ${index + 2}`}
              className="aspect-square overflow-hidden rounded-[7px] bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.filename}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

interface LightboxProps {
  store: ShowcaseStore;
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}

function Lightbox({ store, index, onClose, onStep }: LightboxProps) {
  const photo = store.photos[index];
  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,12,24,0.92)] p-8 max-md:p-3"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-[18px] right-[22px] flex size-11 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/22 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-5" aria-hidden="true" />
      </button>

      <div
        className="flex max-h-full max-w-full items-center gap-3.5"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Previous photo"
          disabled={store.photos.length < 2}
          onClick={() => onStep(-1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/24 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:cursor-default disabled:opacity-30 max-md:size-10"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-7" aria-hidden="true" />
        </button>

        <figure className="flex min-w-0 flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.filename}
            className="max-h-[78vh] max-w-[min(80vw,1100px)] rounded-lg object-contain shadow-[0_18px_50px_rgba(0,0,0,0.5)] max-md:max-h-[70vh] max-md:max-w-[92vw]"
          />
          <figcaption className="flex items-center gap-3.5 text-[13.5px] text-white">
            <span className="font-semibold">
              {store.retailer} {store.storeNo} — {store.title}
            </span>
            <span className="text-white/60">
              {index + 1} / {store.photos.length}
            </span>
          </figcaption>
        </figure>

        <button
          type="button"
          aria-label="Next photo"
          disabled={store.photos.length < 2}
          onClick={() => onStep(1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/24 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none disabled:cursor-default disabled:opacity-30 max-md:size-10"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-7" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
