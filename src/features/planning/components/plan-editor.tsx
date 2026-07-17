"use client";

import { useState } from "react";
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
} from "../schemas";
import {
  PLAN_RATE_TYPE_OPTIONS,
  QUESTION_REQUEST_KIND_OPTIONS,
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
import {
  PlannerAddMenu,
  RowReorderButtons,
} from "./planner-palette-panel";
import { PlannerPaletteTemplateDialog } from "./planner-palette-template-dialog";

const TABS: { id: PlanEditorTab; label: string }[] = [
  { id: "details", label: "Plans" },
  { id: "stores", label: "Stores" },
  { id: "visits", label: "Visits" },
  { id: "photos", label: "Photos" },
  { id: "questions", label: "Questions" },
  { id: "documents", label: "Documents" },
];

const READINESS_CLASSES: Record<string, string> = {
  ready: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

interface PlanEditorProps {
  plan: ListablePlan;
  cycleId: number;
  programId: number;
  customerId: number | null;
  retailerId: number | null;
  cycles: ListableCycle[];
  customers: Array<{ id: number; title: string }>;
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
  onDeleted,
  onCopied,
}: PlanEditorProps) {
  const session = useSession();
  const role = session!.user.role;
  const [tab, setTab] = useState<PlanEditorTab>("details");
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
  const [questionTemplates, setQuestionTemplates] = useState<QuestionPaletteTemplate[]>(
    () => [
      ...DEFAULT_QUESTION_PALETTE_TEMPLATES,
      ...loadCustomQuestionPaletteTemplates(),
    ],
  );
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
    if (
      readiness &&
      readiness.readiness === "warning" &&
      readiness.warnings.length > 0
    ) {
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
          <p className="text-xs capitalize text-muted-foreground">
            {status}
            {plan.is_survey ? " · survey" : ""}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            READINESS_CLASSES[readiness?.readiness ?? "warning"] ??
              READINESS_CLASSES.warning,
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

        <div className="flex flex-wrap gap-1 border-b pb-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30",
                tab === item.id && "bg-accent",
              )}
            >
              {item.label}
            </button>
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
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as PlanRateType)}
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {photosArray.fields.length} photo request
                  {photosArray.fields.length === 1 ? "" : "s"}
                </p>
                <PlannerAddMenu
                  label="Add photo"
                  items={photoTemplates}
                  disabled={!editPhotos || busy}
                  onAdd={(id) => {
                    const template = photoTemplates.find((item) => item.id === id);
                    if (template) photosArray.append(photoRowFromTemplate(template));
                  }}
                  onAddCustom={() => setPhotoTemplateDialogOpen(true)}
                  onRemoveCustom={(id) => {
                    const next = photoTemplates.filter((item) => item.id !== id);
                    setPhotoTemplates(next);
                    saveCustomPhotoPaletteTemplates(next);
                  }}
                />
              </div>
              {photosArray.fields.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Use Add photo to choose a type for this plan.
                </p>
              ) : null}
              {photosArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-48 flex-1 space-y-1">
                    <Label>Description</Label>
                    <Input
                      disabled={!editPhotos || busy}
                      {...form.register(`photos.${index}.description`)}
                    />
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      disabled={!editPhotos || busy}
                      {...form.register(`photos.${index}.required`)}
                    />
                    Required
                  </label>
                  <RowReorderButtons
                    index={index}
                    total={photosArray.fields.length}
                    disabled={!editPhotos || busy}
                    onMove={(from, to) => photosArray.move(from, to)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!editPhotos || busy}
                    onClick={() => photosArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {tab === "questions" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {questionsArray.fields.length} question request
                  {questionsArray.fields.length === 1 ? "" : "s"}
                </p>
                <PlannerAddMenu
                  label="Add question"
                  items={questionTemplates}
                  disabled={!editQuestions || busy}
                  onAdd={(id) => {
                    const template = questionTemplates.find((item) => item.id === id);
                    if (template) questionsArray.append(questionRowFromTemplate(template));
                  }}
                  onAddCustom={() => setQuestionTemplateDialogOpen(true)}
                  onRemoveCustom={(id) => {
                    const next = questionTemplates.filter((item) => item.id !== id);
                    setQuestionTemplates(next);
                    saveCustomQuestionPaletteTemplates(next);
                  }}
                />
              </div>
              {questionsArray.fields.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Use Add question to choose a type for this plan.
                </p>
              ) : null}
              {questionsArray.fields.map((field, index) => (
                <Controller
                  key={field.id}
                  control={form.control}
                  name={`questions.${index}.kind`}
                  render={({ field: kindField }) => {
                    const kind = kindField.value;
                    const needsData =
                      kind === "checklist" ||
                      kind === "multiple_choice" ||
                      kind === "number";
                    return (
                      <div className="space-y-2 rounded-lg border p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Description</Label>
                            <Input
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.description`)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Kind</Label>
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
                        </div>
                        {needsData && (
                          <div className="space-y-1">
                            <Label>
                              {kind === "number"
                                ? "Min,max"
                                : kind === "checklist"
                                  ? "Items (comma-separated)"
                                  : "Choices (comma-separated)"}
                            </Label>
                            <Input
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.data`)}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              disabled={!editQuestions || busy}
                              {...form.register(`questions.${index}.required`)}
                            />
                            Required
                          </label>
                          <div className="flex items-center gap-1">
                            <RowReorderButtons
                              index={index}
                              total={questionsArray.fields.length}
                              disabled={!editQuestions || busy}
                              onMove={(from, to) => questionsArray.move(from, to)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!editQuestions || busy}
                              onClick={() => questionsArray.remove(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
              ))}
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {documentsArray.fields.length} document
                  {documentsArray.fields.length === 1 ? "" : "s"}
                </p>
                <PlannerAddMenu
                  label="Add document"
                  items={DEFAULT_DOCUMENT_PALETTE_TEMPLATES}
                  disabled={!editDocuments || busy}
                  onAdd={(id) => {
                    const template = DEFAULT_DOCUMENT_PALETTE_TEMPLATES.find(
                      (item) => item.id === id,
                    );
                    if (template) documentsArray.append(documentRowFromTemplate(template));
                  }}
                />
              </div>
              {documentsArray.fields.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Use Add document to choose Media, PDF, or Excel.
                </p>
              ) : null}
              {documentsArray.fields.map((field, index) => {
                const location = form.getValues(`documents.${index}.location`);
                const kind = form.getValues(`documents.${index}.kind`) ?? "media";
                return (
                  <div key={field.id} className="space-y-2 rounded-lg border p-3">
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
                      <RowReorderButtons
                        index={index}
                        total={documentsArray.fields.length}
                        disabled={!editDocuments || busy}
                        onMove={(from, to) => documentsArray.move(from, to)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!editDocuments || busy}
                        onClick={() => documentsArray.remove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="submit"
              disabled={
                busy ||
                !canSavePlan(status, role) ||
                !form.formState.isDirty ||
                (!form.formState.dirtyFields.documents &&
                  Object.keys(
                    buildPatchablePlan(form.getValues(), form.formState.dirtyFields),
                  ).length === 0)
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
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handlePreview}
              >
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

        <div>
          <h3 className="mb-2 text-sm font-medium">Readiness</h3>
          {readinessQuery.isLoading ? (
            <LoadingState label="Checking readiness…" className="p-4" />
          ) : (readiness?.warnings.length ?? 0) === 0 ? (
            <p className="text-sm text-green-700">No warnings — this plan looks ready.</p>
          ) : (
            <ul className="space-y-1">
              {readiness!.warnings.map((warning, index) => (
                <li
                  key={`${warning.code}-${index}`}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    warning.severity === "high"
                      ? "bg-red-50 text-red-800"
                      : "bg-amber-50 text-amber-800",
                  )}
                >
                  {warning.message || warning.code}
                </li>
              ))}
            </ul>
          )}
          {(readiness?.unassigned_stores.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Stores without default assignee
              </p>
              <ul className="text-xs text-red-700">
                {readiness!.unassigned_stores.map((store, index) => (
                  <li key={store.id ?? index}>
                    {store.store_no != null ? `${store.store_no} · ` : ""}
                    {store.title || "Store"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
