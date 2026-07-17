import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type {
  CopyPlanOptions,
  DetailedPlan,
  PatchablePlan,
  PlanDocumentFormRow,
  PlanEditorFormValues,
  PlanPhotoFormRow,
  PlanQuestionFormRow,
  PlanVisitFormRow,
  PostablePlan,
} from "./schemas";
import type {
  DocumentPaletteTemplate,
  PhotoPaletteTemplate,
  QuestionPaletteTemplate,
} from "./palette-types";
import type { PlanRateType, QuestionRequestKind } from "./types";

type DetailedQuestionRequest = DetailedPlan["question_requests"][number];

/** Next group letter A–Z from plan count (Angular `getNextGroup`). */
export function getNextGroup(planCount: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[planCount % 26] ?? "A";
}

/** Normalize API date values to `yyyy-MM-dd` for `<input type="date">`. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : "";
  }
  const parsed = parseISO(value.length === 10 ? `${value}T00:00:00` : value);
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  // Already a bare date string
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

export function encodeQuestionRequestData(
  question: DetailedQuestionRequest,
): string {
  const kind = question.kind;
  const data = question.data as Record<string, unknown> | null | undefined;
  if (!data) return "";
  if (kind === "checklist" && Array.isArray(data.items)) {
    return data.items.map(String).join(",");
  }
  if (kind === "multiple_choice" && Array.isArray(data.choices)) {
    return data.choices.map(String).join(",");
  }
  if (kind === "number") {
    return [data.min, data.max].join(",");
  }
  return "";
}

export function decodeQuestionRequestData(
  kind: QuestionRequestKind,
  data: string,
): unknown {
  if (kind === "text" || kind === "true_false") return null;
  if (kind === "checklist") {
    return { items: String(data).split(",") };
  }
  if (kind === "multiple_choice") {
    return { choices: String(data).split(",") };
  }
  if (kind === "number") {
    const [min, max] = String(data).split(",");
    return { min: Number(min), max: Number(max) };
  }
  return null;
}

export function detailedPlanToFormValues(plan: DetailedPlan): PlanEditorFormValues {
  return {
    group: plan.group,
    rate_type: (plan.rate_type || "hourly") as PlanRateType,
    rate: plan.rate,
    is_survey: plan.is_survey,
    stores: [...plan.stores],
    visits: plan.visits.map(
      (visit): PlanVisitFormRow => ({
        _id: visit.id,
        opens_on: toDateInputValue(visit.opens_at),
        closes_on: toDateInputValue(visit.closes_at),
        hours: Math.floor(visit.planned_minutes / 60),
        minutes: visit.planned_minutes % 60,
      }),
    ),
    photos: plan.photo_requests.map(
      (photo): PlanPhotoFormRow => ({
        _id: photo.id,
        description: photo.description,
        required: photo.required,
      }),
    ),
    questions: plan.question_requests.map(
      (question): PlanQuestionFormRow => ({
        _id: question.id,
        description: question.description,
        kind: (question.kind || "text") as QuestionRequestKind,
        required: question.required,
        data: encodeQuestionRequestData(question),
      }),
    ),
    documents: plan.documents.map(
      (document): PlanDocumentFormRow => ({
        _id: document.id,
        title: document.title,
        description: document.description,
        location: document.location,
        file: null,
        kind: documentKindFromFileType(document.file_type),
      }),
    ),
  };
}

function documentKindFromFileType(fileType: string): PlanDocumentFormRow["kind"] {
  const t = fileType?.toLowerCase() ?? "";
  if (t.includes("pdf")) return "pdf";
  if (t.includes("xls") || t.includes("sheet") || t.includes("csv")) return "excel";
  return "media";
}

export function emptyVisitRow(from?: PlanVisitFormRow): PlanVisitFormRow {
  return {
    _id: null,
    opens_on: from?.opens_on ?? "",
    closes_on: from?.closes_on ?? "",
    hours: from?.hours ?? 0,
    minutes: from?.minutes ?? 0,
  };
}

export function emptyPhotoRow(): PlanPhotoFormRow {
  return { _id: null, description: "Photo", required: true };
}

export function emptyQuestionRow(): PlanQuestionFormRow {
  return {
    _id: null,
    description: "Question",
    kind: "text",
    required: true,
    data: "",
  };
}

export function emptyDocumentRow(): PlanDocumentFormRow {
  return {
    _id: null,
    title: "",
    description: "",
    location: "",
    file: null,
    kind: "media",
  };
}

export function photoRowFromTemplate(template: PhotoPaletteTemplate): PlanPhotoFormRow {
  return {
    _id: null,
    description: template.description,
    required: template.required,
  };
}

export function questionRowFromTemplate(
  template: QuestionPaletteTemplate,
): PlanQuestionFormRow {
  return {
    _id: null,
    description: template.description,
    kind: template.kind,
    required: template.required,
    data: template.data,
  };
}

export function documentRowFromTemplate(
  template: DocumentPaletteTemplate,
): PlanDocumentFormRow {
  return {
    _id: null,
    title: template.title,
    description: template.description,
    location: "",
    file: null,
    kind: template.kind,
  };
}

function parseDay(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value.length === 10 ? `${value}T00:00:00` : value);
  return isValid(parsed) ? parsed : null;
}

/** Shift a visit date by the delta between original and target cycle starts. */
export function syncVisitDate(
  visitDate: string | Date,
  originalCycleStartsOn: string | null | undefined,
  targetCycleStartsOn: string | null | undefined,
): string {
  const visit = parseDay(visitDate);
  const originalStart = parseDay(originalCycleStartsOn);
  const targetStart = parseDay(targetCycleStartsOn);
  if (!visit || !originalStart || !targetStart) {
    return toDateInputValue(visitDate);
  }
  const offset = differenceInCalendarDays(visit, originalStart);
  return format(addDays(targetStart, offset), "yyyy-MM-dd");
}

/** Build `POST /v1/plans/` body for copy (Angular `doPlanCopy`). */
export function buildCopyPlanPayload(
  plan: DetailedPlan,
  options: CopyPlanOptions,
): PostablePlan {
  const payload: PostablePlan = {
    cycle: options.cycleId,
    program: options.programId,
    group: options.group,
    rate_type: (plan.rate_type || "hourly") as PlanRateType,
    rate: plan.rate,
    is_survey: plan.is_survey,
    photo_requests: plan.photo_requests.map((photo) => ({
      description: photo.description,
      required: photo.required,
    })),
    question_requests: plan.question_requests.map((question) => ({
      description: question.description,
      required: question.required,
      kind: question.kind,
      data: question.data ?? null,
    })),
    documents: plan.documents.map((document) => document.id),
  };

  if (options.usePriorCycleStores && options.priorCycleStoreIds.length > 0) {
    payload.stores = options.priorCycleStoreIds;
  } else if (options.copyStores) {
    payload.stores = [...plan.stores];
  }

  if (options.copyVisits) {
    payload.visits = plan.visits.map((visit) => {
      const opensAt = options.syncVisits
        ? syncVisitDate(visit.opens_at, plan.cycle?.starts_on, options.targetCycleStartsOn)
        : toDateInputValue(visit.opens_at);
      const closesAt = options.syncVisits
        ? syncVisitDate(visit.closes_at, plan.cycle?.starts_on, options.targetCycleStartsOn)
        : toDateInputValue(visit.closes_at);
      return {
        opens_at: opensAt,
        closes_at: closesAt,
        planned_minutes: visit.planned_minutes,
      };
    });
  }

  return payload;
}

export function isRowDirty(dirt: unknown, index: number): boolean {
  if (dirt === true) return true;
  if (dirt == null) return false;
  if (typeof dirt === "object") {
    return (dirt as Record<number, unknown>)[index] != null;
  }
  return false;
}

/**
 * Build a v1 PATCH body from dirty form fields (Angular `doPlanSave` parity).
 * Nested rows that exist and are unchanged are sent as IDs; new/changed rows
 * are sent as objects.
 */
export function buildPatchablePlan(
  values: PlanEditorFormValues,
  dirtyFields: Partial<Record<keyof PlanEditorFormValues, unknown>>,
): PatchablePlan {
  const patch: PatchablePlan = {};

  if (dirtyFields.group) patch.group = values.group;
  if (dirtyFields.rate_type) patch.rate_type = values.rate_type;
  if (dirtyFields.rate) patch.rate = Number(values.rate) || 0;
  if (dirtyFields.is_survey) patch.is_survey = values.is_survey;
  if (dirtyFields.stores) patch.stores = values.stores;

  if (dirtyFields.visits) {
    const visitDirties = dirtyFields.visits;
    patch.visits = values.visits.map((visit, index) => {
      const rowDirty = isRowDirty(visitDirties, index);
      if (visit._id && !rowDirty) return visit._id;
      return {
        opens_at: visit.opens_on,
        closes_at: visit.closes_on,
        planned_minutes: (Number(visit.hours) || 0) * 60 + (Number(visit.minutes) || 0),
      };
    });
  }

  if (dirtyFields.photos) {
    const photoDirties = dirtyFields.photos;
    patch.photo_requests = values.photos.map((photo, index) => {
      const rowDirty = isRowDirty(photoDirties, index);
      if (photo._id && !rowDirty) return photo._id;
      return {
        description: photo.description,
        required: photo.required,
      };
    });
  }

  if (dirtyFields.questions) {
    const questionDirties = dirtyFields.questions;
    patch.question_requests = values.questions.map((question, index) => {
      const rowDirty = isRowDirty(questionDirties, index);
      if (question._id && !rowDirty) return question._id;
      return {
        description: question.description,
        required: question.required,
        kind: question.kind,
        data: decodeQuestionRequestData(question.kind, question.data),
      };
    });
  }

  return patch;
}

export function showPlanRateInput(rateType: PlanRateType): boolean {
  return rateType === "plan_hourly" || rateType === "plan_project";
}

export function storeLabel(store: {
  title: string;
  store_no?: string | number | null;
  retailer?: { title?: string } | null;
}): string {
  const retailer = store.retailer?.title ?? "";
  const storeNo = store.store_no != null ? String(store.store_no) : "";
  const head = [retailer, storeNo].filter(Boolean).join(" ");
  return head || store.title;
}
