"use client";

import {
  Alert02Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react"; // used for local UI state (dialogs, search, templates)
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import { useSession } from "@/features/auth/hooks";
import { formatMinutes } from "@/features/jobs/schemas";
import type { ListableCycle } from "@/shared/services/entities/cycles";
import type { ListablePlan } from "../api";
import {
  useAllocatePlan,
  useCompletePlan,
  useCopyPlan,
  useDeletePlan,
  useDetailedPlan,
  usePatchPlan,
  usePlanReadiness,
  usePreviewAllocate,
  useStoresForRetailer,
  useUnverifyPlan,
  useVerifyPlan,
} from "../hooks";
import {
  canAllocatePlan,
  canCompletePlan,
  canDeletePlan,
  canEditDocuments,
  canEditGroup,
  canEditPhotos,
  canEditQuestions,
  canEditRate,
  canEditStores,
  canEditVisits,
  canPlanSurvey,
  canPreviewDispatch,
  canSavePlan,
  canUnverifyPlan,
  canVerifyPlan,
} from "../permissions";
import type {
  AllocatePreview,
  CopyPlanOptions,
  PlanEditorFormValues,
  PlanReadinessDetail,
} from "../schemas";
import {
  PLAN_RATE_TYPE_OPTIONS,
  QUESTION_REQUEST_KIND_OPTIONS,
  normalizePlanRateType,
  type PlanEditorTab,
  type PlanRateType,
  type QuestionRequestKind,
} from "../types";
import {
  DEFAULT_DOCUMENT_PALETTE_TEMPLATES,
  DEFAULT_PHOTO_PALETTE_TEMPLATES,
  DEFAULT_QUESTION_PALETTE_TEMPLATES,
  documentFileAccept,
  type PhotoPaletteTemplate,
  type QuestionPaletteTemplate,
} from "../palette-types";
import {
  loadCustomPhotoPaletteTemplates,
  loadCustomQuestionPaletteTemplates,
  saveCustomPhotoPaletteTemplates,
  saveCustomQuestionPaletteTemplates,
} from "../palette-storage";
import {
  buildCopyPlanPayload,
  buildPatchablePlan,
  detailedPlanToFormValues,
  documentRowFromTemplate,
  emptyVisitRow,
  photoRowFromTemplate,
  questionRowFromTemplate,
  showPlanRateInput,
  storeLabel,
} from "../utils";
import { AllocatePreviewDialog } from "./allocate-preview-dialog";
import { PlannerCopyDialog } from "./planner-copy-dialog";
import { PlannerDndBoard } from "./planner-dnd-board";
import { PlannerPaletteTemplateDialog } from "./planner-palette-template-dialog";

const READINESS_CLASSES: Record<string, string> = {
  ready: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const wholeUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PANEL_LEVELS = {
  ready: {
    icon: CheckmarkCircle02Icon,
    container: "border-success/40",
    heading: "text-success",
    badge: "bg-success/15 text-success",
  },
  warning: {
    icon: Alert02Icon,
    container: "border-warning/50",
    heading: "text-warning",
    badge: "bg-warning/15 text-warning",
  },
  blocked: {
    icon: UnavailableIcon,
    container: "border-destructive/40",
    heading: "text-destructive",
    badge: "bg-destructive/15 text-destructive",
  },
} as const;

/**
 * Dispatch readiness panel — parity with the Angular planner's readiness card:
 * KPI row (expected jobs / rep coverage / plan cost / budget left), warning
 * rows, unassigned-store list, and the per-rep workload preview. All data
 * comes from `GET /v2/plans/{id}/readiness/`.
 */
function DispatchReadinessPanel({ readiness }: { readiness: PlanReadinessDetail }) {
  const level =
    PANEL_LEVELS[readiness.readiness as keyof typeof PANEL_LEVELS] ?? PANEL_LEVELS.warning;
  const budget = readiness.budget;

  const stats = [
    { label: "Expected jobs", value: readiness.expected_jobs.toLocaleString() },
    {
      label: "Rep coverage",
      value:
        readiness.coverage_pct != null
          ? `${readiness.coverage_pct}%`
          : readiness.is_survey
            ? "All reps"
            : "—",
    },
    {
      label: "Plan cost",
      value: readiness.cost != null ? wholeUsd.format(readiness.cost) : "—",
    },
    {
      label: "Budget left",
      value: budget ? wholeUsd.format(budget.customer_remaining) : "—",
      danger: budget?.over_budget ?? false,
    },
  ];

  return (
    <section
      aria-label="Dispatch readiness"
      className={cn("space-y-4 rounded-xl border p-4", level.container)}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn("flex items-center gap-2 text-sm font-semibold", level.heading)}>
          <HugeiconsIcon icon={level.icon} aria-hidden="true" className="size-4.5" />
          Dispatch readiness
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
            level.badge,
          )}
        >
          {readiness.readiness}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card px-3 py-2.5">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                stat.danger && "text-destructive",
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {readiness.warnings.length === 0 ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden="true" className="size-4" />
          No warnings — this plan is ready to dispatch.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {readiness.warnings.map((warning, index) => (
            <li
              key={`${warning.code}-${index}`}
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                warning.severity === "high"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning",
              )}
            >
              <HugeiconsIcon
                icon={warning.severity === "high" ? UnavailableIcon : AlertCircleIcon}
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              {warning.message || warning.code}
            </li>
          ))}
        </ul>
      )}

      {readiness.unassigned_stores.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">
            Stores without a rep ({readiness.unassigned_stores.length})
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {readiness.unassigned_stores.map((store, index) => (
              <li key={store.id ?? index}>
                {store.retailer ? `${store.retailer} ` : ""}
                {store.store_no != null ? `#${store.store_no}` : ""}
                {store.title ? ` — ${store.title}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {readiness.rep_workload_preview.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">Rep workload preview</p>
          <ul className="divide-y divide-border/60 rounded-md border bg-card text-sm">
            {readiness.rep_workload_preview.map((rep) => (
              <li
                key={rep.user_id}
                className="flex items-center justify-between gap-2 px-3 py-1.5"
              >
                <span className="min-w-0 truncate">
                  {rep.rep_no != null && (
                    <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">
                      #{rep.rep_no}
                    </span>
                  )}
                  {rep.name}
                </span>
                <span className="shrink-0 text-xs font-medium text-primary tabular-nums">
                  {rep.jobs.toLocaleString()} job{rep.jobs === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface PlanEditorProps {
  plan: ListablePlan;
  cycleId: number;
  programId: number;
  customerId: number | null;
  retailerId: number | null;
  cycles: ListableCycle[];
  customers: Array<{ id: number; title: string }>;
  /** Tab is controlled externally by PlanningView so group card icons work. */
  tab: PlanEditorTab;
  onDeleted: () => void;
  onCopied: (planId: number) => void;
}

export function PlanEditor({
  plan,
  cycleId,
  programId,
  customerId,
  retailerId,
  cycles,
  customers,
  tab,
  onDeleted,
  onCopied,
}: PlanEditorProps) {
  const session = useSession();
  const role = session!.user.role;
  const [storeSearch, setStoreSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAllocate, setConfirmAllocate] = useState(false);
  const [confirmAllocateWarnings, setConfirmAllocateWarnings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<AllocatePreview | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [photoTemplates, setPhotoTemplates] = useState<PhotoPaletteTemplate[]>(() => [
    ...DEFAULT_PHOTO_PALETTE_TEMPLATES,
    ...loadCustomPhotoPaletteTemplates(),
  ]);
  const [questionTemplates, setQuestionTemplates] = useState<QuestionPaletteTemplate[]>(() => [
    ...DEFAULT_QUESTION_PALETTE_TEMPLATES,
    ...loadCustomQuestionPaletteTemplates(),
  ]);
  const [photoTemplateDialogOpen, setPhotoTemplateDialogOpen] = useState(false);
  const [questionTemplateDialogOpen, setQuestionTemplateDialogOpen] = useState(false);

  const detailedQuery = useDetailedPlan(plan.id);
  const readinessQuery = usePlanReadiness(plan.id);
  const storesQuery = useStoresForRetailer(retailerId);

  const patchMutation = usePatchPlan(cycleId, programId, plan.id);
  const deleteMutation = useDeletePlan(cycleId, programId);
  const completeMutation = useCompletePlan(cycleId, programId);
  const verifyMutation = useVerifyPlan(cycleId, programId);
  const unverifyMutation = useUnverifyPlan(cycleId, programId);
  const allocateMutation = useAllocatePlan(cycleId, programId);
  const previewMutation = usePreviewAllocate();
  const copyMutation = useCopyPlan(cycleId, programId);

  const detailed = detailedQuery.data;
  const form = useForm<PlanEditorFormValues>({
    values: detailed ? detailedPlanToFormValues(detailed) : undefined,
    resetOptions: { keepDirtyValues: false },
  });

  const visitsArray = useFieldArray({ control: form.control, name: "visits" });
  const photosArray = useFieldArray({ control: form.control, name: "photos" });
  const questionsArray = useFieldArray({ control: form.control, name: "questions" });
  const documentsArray = useFieldArray({ control: form.control, name: "documents" });

  const rateType = useWatch({ control: form.control, name: "rate_type" });
  const selectedStores = useWatch({ control: form.control, name: "stores" }) ?? [];
  const status = detailed?.status ?? plan.status;
  const readiness = readinessQuery.data;
  const stores = storesQuery.data ?? [];
  const filteredStores = stores.filter((store) => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      storeLabel(store).toLowerCase().includes(q) ||
      store.title.toLowerCase().includes(q) ||
      String(store.province).toLowerCase().includes(q)
    );
  });

  const busy =
    patchMutation.isPending ||
    deleteMutation.isPending ||
    completeMutation.isPending ||
    verifyMutation.isPending ||
    unverifyMutation.isPending ||
    allocateMutation.isPending ||
    previewMutation.isPending ||
    copyMutation.isPending;

  const editGroup = canEditGroup(status, role);
  const editRate = canEditRate(status, role);
  const editStores = canEditStores(status, role);
  const editVisits = canEditVisits(status, role);
  const editPhotos = canEditPhotos(status, role);
  const editQuestions = canEditQuestions(status, role);
  const editDocuments = canEditDocuments(status, role);
  const allowPreview = canPreviewDispatch(status, role);
  const allowAllocate = canAllocatePlan(
    status,
    role,
    readinessQuery.isSuccess ? (readiness?.can_allocate ?? false) : null,
  );

  function requestAllocate() {
    if (readiness && readiness.readiness === "warning" && readiness.warnings.length > 0) {
      setConfirmAllocateWarnings(true);
      return;
    }
    allocateMutation.mutate(plan.id);
  }

  function toggleStore(storeId: number) {
    if (!editStores) return;
    const current = form.getValues("stores");
    const next = current.includes(storeId)
      ? current.filter((id) => id !== storeId)
      : [...current, storeId];
    form.setValue("stores", next, { shouldDirty: true });
  }

  function onSave() {
    const values = form.getValues();
    const dirty = form.formState.dirtyFields;
    const hasDocs = !!dirty.documents;
    const patch = buildPatchablePlan(values, dirty);
    if (!hasDocs && Object.keys(patch).length === 0) return;
    patchMutation.mutate(
      { values, dirtyFields: dirty },
      {
        onSuccess: (result) => {
          if (result) form.reset(values);
        },
      },
    );
  }

  function handlePreview() {
    setPreview(null);
    setPreviewOpen(true);
    previewMutation.mutate(plan.id, {
      onSuccess: (data) => setPreview(data),
      onError: () => setPreviewOpen(false),
    });
  }

  function handleCopy(options: CopyPlanOptions) {
    if (!detailed) return;
    copyMutation.mutate(buildCopyPlanPayload(detailed, options), {
      onSuccess: (created) => {
        setCopyOpen(false);
        onCopied(created.id);
      },
    });
  }

  if (detailedQuery.isLoading || !detailed) {
    return <LoadingState label="Loading plan…" className="min-h-60" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Group {plan.group || "—"}</CardTitle>
          <p className="text-xs text-muted-foreground capitalize">
            {status}
            {plan.is_survey ? " · survey" : ""}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            READINESS_CLASSES[readiness?.readiness ?? "warning"] ?? READINESS_CLASSES.warning,
          )}
        >
          {readiness?.readiness ?? "warning"}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Stores", value: String(plan.num_stores) },
            { label: "Visits", value: String(plan.num_visits) },
            { label: "Expected jobs", value: String(plan.expected_jobs) },
            {
              label: "Total hours",
              value: formatMinutes(Math.round(plan.total_hours * 60)),
            },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-sm font-medium">{metric.value}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          {tab === "details" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-group">Group name</Label>
                <Input
                  id="plan-group"
                  disabled={!editGroup || busy}
                  {...form.register("group")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate type</Label>
                <Controller
                  control={form.control}
                  name="rate_type"
                  render={({ field }) => (
                    <Select
                      value={normalizePlanRateType(field.value)}
                      onValueChange={(value) => {
                        if (!value) return;
                        field.onChange(normalizePlanRateType(value));
                      }}
                      disabled={!editRate || busy}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Rate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_RATE_TYPE_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {showPlanRateInput(rateType) && (
                <div className="space-y-1.5">
                  <Label htmlFor="plan-rate">Rate</Label>
                  <Input
                    id="plan-rate"
                    type="number"
                    min={0}
                    disabled={!editRate || busy}
                    {...form.register("rate", { valueAsNumber: true })}
                  />
                </div>
              )}
              {canPlanSurvey(role) && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    disabled={!editVisits || busy}
                    {...form.register("is_survey")}
                  />
                  This is a survey (assign to all reps)
                </label>
              )}
            </div>
          )}

          {tab === "stores" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {selectedStores.length} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editStores || busy || stores.length === 0}
                    onClick={() =>
                      form.setValue(
                        "stores",
                        stores.map((store) => store.id),
                        { shouldDirty: true },
                      )
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editStores || busy}
                    onClick={() => form.setValue("stores", [], { shouldDirty: true })}
                  >
                    Unselect all
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Search stores"
                value={storeSearch}
                onChange={(event) => setStoreSearch(event.target.value)}
              />
              {storesQuery.isLoading ? (
                <LoadingState label="Loading stores…" className="p-4" />
              ) : (
                <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
                  {filteredStores.map((store) => {
                    const checked = selectedStores.includes(store.id);
                    const missingAssignee = store.num_user_priorities <= 0;
                    return (
                      <li key={store.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-accent/40",
                            !editStores && "cursor-not-allowed opacity-70",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-primary"
                            checked={checked}
                            disabled={!editStores || busy}
                            onChange={() => toggleStore(store.id)}
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-medium">
                              {storeLabel(store)}
                              {missingAssignee && (
                                <span
                                  className="text-xs text-red-600"
                                  title="No default assignee"
                                >
                                  No assignee
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {store.title}
                              {store.province ? ` (${store.province})` : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  {filteredStores.length === 0 && (
                    <li className="px-3 py-4 text-sm text-muted-foreground">
                      No stores match your search.
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {tab === "visits" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {visitsArray.fields.length} visit
                  {visitsArray.fields.length === 1 ? "" : "s"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!editVisits || busy}
                  onClick={() =>
                    visitsArray.append(emptyVisitRow(form.getValues("visits").at(-1)), {
                      shouldFocus: false,
                    })
                  }
                >
                  Add visit
                </Button>
              </div>
              <div className="space-y-3">
                {visitsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_88px_88px_auto]"
                  >
                    <div className="space-y-1">
                      <Label>Opens on</Label>
                      <Input
                        type="date"
                        disabled={!editVisits || busy}
                        {...form.register(`visits.${index}.opens_on`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Closes on</Label>
                      <Input
                        type="date"
                        disabled={!editVisits || busy}
                        {...form.register(`visits.${index}.closes_on`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Hours</Label>
                      <Input
                        type="number"
                        min={0}
                        disabled={!editVisits || busy}
                        {...form.register(`visits.${index}.hours`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Minutes</Label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        disabled={!editVisits || busy}
                        {...form.register(`visits.${index}.minutes`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!editVisits || busy}
                        onClick={() => visitsArray.remove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "photos" && (
            <PlannerDndBoard
              libraryAriaLabel="Photo library"
              dropPanelAriaLabel="Plan photos"
              itemNoun="photo"
              templates={photoTemplates}
              rowIds={photosArray.fields.map((field) => field.id)}
              disabled={!editPhotos || busy}
              onAddCustom={() => setPhotoTemplateDialogOpen(true)}
              onRemoveCustom={(id) => {
                const next = photoTemplates.filter((item) => item.id !== id);
                setPhotoTemplates(next);
                saveCustomPhotoPaletteTemplates(next);
              }}
              onInsertFromTemplate={(template, index) => {
                photosArray.insert(index, photoRowFromTemplate(template));
              }}
              onReorder={(from, to) => photosArray.move(from, to)}
              onRemoveRow={(index) => photosArray.remove(index)}
              rowTitle={(index) => `Description for photo ${index + 1}`}
              renderRow={(index) => (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-48 flex-1 space-y-1">
                    <Label className="sr-only">Description</Label>
                    <Input
                      placeholder="Description"
                      disabled={!editPhotos || busy}
                      {...form.register(`photos.${index}.description`)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      disabled={!editPhotos || busy}
                      {...form.register(`photos.${index}.required`)}
                    />
                    Is Required?
                  </label>
                </div>
              )}
            />
          )}

          {tab === "questions" && (
            <PlannerDndBoard
              libraryAriaLabel="Question library"
              dropPanelAriaLabel="Plan questions"
              itemNoun="question"
              templates={questionTemplates}
              rowIds={questionsArray.fields.map((field) => field.id)}
              disabled={!editQuestions || busy}
              onAddCustom={() => setQuestionTemplateDialogOpen(true)}
              onRemoveCustom={(id) => {
                const next = questionTemplates.filter((item) => item.id !== id);
                setQuestionTemplates(next);
                saveCustomQuestionPaletteTemplates(next);
              }}
              onInsertFromTemplate={(template, index) => {
                questionsArray.insert(index, questionRowFromTemplate(template));
              }}
              onReorder={(from, to) => questionsArray.move(from, to)}
              onRemoveRow={(index) => questionsArray.remove(index)}
              rowTitle={(index) => `Question ${index + 1}`}
              renderRow={(index) => (
                <Controller
                  control={form.control}
                  name={`questions.${index}.kind`}
                  render={({ field: kindField }) => {
                    const kind = kindField.value;
                    const needsData =
                      kind === "checklist" || kind === "multiple_choice" || kind === "number";
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="min-w-48 flex-1 space-y-1">
                            <Label>Description</Label>
                            <Input
                              placeholder="Description"
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.description`)}
                            />
                          </div>
                          <div className="w-full space-y-1 sm:w-[220px]">
                            <Label>Question type</Label>
                            <Select
                              value={kindField.value}
                              onValueChange={(value) =>
                                kindField.onChange(value as QuestionRequestKind)
                              }
                              disabled={!editQuestions || busy}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {QUESTION_REQUEST_KIND_OPTIONS.map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <label className="flex items-center gap-2 pb-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.required`)}
                            />
                            Is Required?
                          </label>
                        </div>
                        {needsData ? (
                          <div className="space-y-1">
                            <Label className="sr-only">
                              {kind === "number"
                                ? "Min,max"
                                : kind === "checklist"
                                  ? "Items"
                                  : "Choices"}
                            </Label>
                            <Input
                              placeholder={
                                kind === "number"
                                  ? "Minimum, maximum"
                                  : kind === "checklist"
                                    ? "Comma-separated tasks"
                                    : "Comma-separated choices"
                              }
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.data`)}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                />
              )}
            />
          )}

          {tab === "documents" && (
            <PlannerDndBoard
              libraryAriaLabel="Document library"
              dropPanelAriaLabel="Plan documents"
              itemNoun="document"
              templates={DEFAULT_DOCUMENT_PALETTE_TEMPLATES}
              rowIds={documentsArray.fields.map((field) => field.id)}
              disabled={!editDocuments || busy}
              onInsertFromTemplate={(template, index) => {
                documentsArray.insert(index, documentRowFromTemplate(template));
              }}
              onReorder={(from, to) => documentsArray.move(from, to)}
              onRemoveRow={(index) => documentsArray.remove(index)}
              rowTitle={(index) => `Document ${index + 1}`}
              renderRow={(index) => {
                const location = form.getValues(`documents.${index}.location`);
                const kind = form.getValues(`documents.${index}.kind`) ?? "media";
                return (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Title</Label>
                        <Input
                          disabled={!editDocuments || busy}
                          {...form.register(`documents.${index}.title`)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Input
                          disabled={!editDocuments || busy}
                          {...form.register(`documents.${index}.description`)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="file"
                        accept={documentFileAccept(kind)}
                        disabled={!editDocuments || busy}
                        className="max-w-xs"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          form.setValue(`documents.${index}.file`, file, {
                            shouldDirty: true,
                          });
                          if (file && !form.getValues(`documents.${index}.title`)) {
                            form.setValue(
                              `documents.${index}.title`,
                              file.name.replace(/\.[^/.]+$/, ""),
                              { shouldDirty: true },
                            );
                          }
                        }}
                      />
                      {location ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={location} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="submit"
              disabled={
                busy ||
                !canSavePlan(status, role) ||
                !form.formState.isDirty ||
                (!form.formState.dirtyFields.documents &&
                  Object.keys(buildPatchablePlan(form.getValues(), form.formState.dirtyFields))
                    .length === 0)
              }
            >
              {patchMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !detailed}
              onClick={() => setCopyOpen(true)}
            >
              Copy
            </Button>
            {canCompletePlan(status) && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => completeMutation.mutate(plan.id)}
              >
                Complete
              </Button>
            )}
            {canVerifyPlan(status, role) && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => verifyMutation.mutate(plan.id)}
              >
                Verify
              </Button>
            )}
            {canUnverifyPlan(status, role) && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => unverifyMutation.mutate(plan.id)}
              >
                Unverify
              </Button>
            )}
            {allowPreview && (
              <Button type="button" variant="outline" disabled={busy} onClick={handlePreview}>
                {previewMutation.isPending ? "Previewing…" : "Preview"}
              </Button>
            )}
            {allowAllocate && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmAllocate(true)}
              >
                Allocate
              </Button>
            )}
            {canDeletePlan(status) && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </form>

        {readinessQuery.isLoading ? (
          <LoadingState label="Checking readiness…" className="p-4" />
        ) : readiness ? (
          <DispatchReadinessPanel readiness={readiness} />
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete plan"
        question="Are you sure you want to delete this plan?"
        confirmLabel="Delete"
        destructive
        onConfirm={() =>
          deleteMutation.mutate(plan.id, {
            onSuccess: () => onDeleted(),
          })
        }
      />

      <ConfirmDialog
        open={confirmAllocate}
        onOpenChange={setConfirmAllocate}
        title="Allocate plan"
        question="Dispatch jobs for this verified plan? Assignees come from each store’s default priorities."
        confirmLabel="Allocate"
        onConfirm={requestAllocate}
      />

      <ConfirmDialog
        open={confirmAllocateWarnings}
        onOpenChange={setConfirmAllocateWarnings}
        title="Allocate with warnings?"
        question={`${(readiness?.warnings ?? [])
          .map((warning) => warning.message)
          .filter(Boolean)
          .join(" ")} Proceed anyway?`}
        confirmLabel="Allocate"
        onConfirm={() => allocateMutation.mutate(plan.id)}
      />

      <AllocatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        group={plan.group || "—"}
        preview={preview}
        canAllocate={allowAllocate}
        allocating={allocateMutation.isPending}
        onAllocate={() => {
          setPreviewOpen(false);
          requestAllocate();
        }}
      />

      {detailed && copyOpen && (
        <PlannerCopyDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          plan={detailed}
          cycles={cycles}
          customers={customers}
          defaultCycleId={cycleId}
          defaultCustomerId={customerId}
          defaultProgramId={programId}
          busy={copyMutation.isPending}
          onCopy={handleCopy}
        />
      )}

      <PlannerPaletteTemplateDialog
        open={photoTemplateDialogOpen}
        onOpenChange={setPhotoTemplateDialogOpen}
        mode="photo"
        onSave={(template) => {
          const next = [...photoTemplates, template as PhotoPaletteTemplate];
          setPhotoTemplates(next);
          saveCustomPhotoPaletteTemplates(next);
        }}
      />

      <PlannerPaletteTemplateDialog
        open={questionTemplateDialogOpen}
        onOpenChange={setQuestionTemplateDialogOpen}
        mode="question"
        onSave={(template) => {
          const next = [...questionTemplates, template as QuestionPaletteTemplate];
          setQuestionTemplates(next);
          saveCustomQuestionPaletteTemplates(next);
        }}
      />
    </Card>
  );
}
