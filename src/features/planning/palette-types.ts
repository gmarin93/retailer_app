import type { QuestionRequestKind } from "./types";

export interface PhotoPaletteTemplate {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  required: boolean;
  icon: string;
  custom?: boolean;
}

export interface QuestionPaletteTemplate {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  kind: QuestionRequestKind;
  required: boolean;
  data: string;
  icon: string;
  custom?: boolean;
}

export type DocumentKind = "media" | "pdf" | "excel";

export interface DocumentPaletteTemplate {
  id: string;
  label: string;
  subtitle: string;
  title: string;
  description: string;
  kind: DocumentKind;
  icon: string;
}

export const DEFAULT_PHOTO_PALETTE_TEMPLATES: PhotoPaletteTemplate[] = [
  {
    id: "photo-standard",
    label: "Standard photo",
    subtitle: "General requirement",
    description: "",
    required: true,
    icon: "photo_camera",
  },
  {
    id: "photo-shelf",
    label: "Shelf / display",
    subtitle: "Product placement",
    description: "Product on shelf or display",
    required: true,
    icon: "storefront",
  },
  {
    id: "photo-signage",
    label: "Signage",
    subtitle: "Exterior or POS",
    description: "Storefront or signage photo",
    required: true,
    icon: "signpost",
  },
  {
    id: "photo-optional",
    label: "Optional photo",
    subtitle: "Not required in field",
    description: "Optional photo",
    required: false,
    icon: "add_a_photo",
  },
];

export const DEFAULT_QUESTION_PALETTE_TEMPLATES: QuestionPaletteTemplate[] = [
  {
    id: "question-text",
    label: "Text",
    subtitle: "Free-form answer",
    description: "",
    kind: "text",
    required: true,
    data: "",
    icon: "short_text",
  },
  {
    id: "question-yes-no",
    label: "Yes / No",
    subtitle: "True or false",
    description: "",
    kind: "true_false",
    required: true,
    data: "",
    icon: "toggle_on",
  },
  {
    id: "question-checklist",
    label: "Checklist",
    subtitle: "Multiple tasks",
    description: "",
    kind: "checklist",
    required: true,
    data: "Item 1, Item 2",
    icon: "checklist",
  },
  {
    id: "question-multiple-choice",
    label: "Multiple choice",
    subtitle: "Pick one option",
    description: "",
    kind: "multiple_choice",
    required: true,
    data: "Option A, Option B",
    icon: "radio_button_checked",
  },
  {
    id: "question-number",
    label: "Number",
    subtitle: "Min / max range",
    description: "",
    kind: "number",
    required: true,
    data: "0, 100",
    icon: "pin",
  },
  {
    id: "question-optional",
    label: "Optional text",
    subtitle: "Not required in field",
    description: "",
    kind: "text",
    required: false,
    data: "",
    icon: "help_outline",
  },
];

export const DEFAULT_DOCUMENT_PALETTE_TEMPLATES: DocumentPaletteTemplate[] = [
  {
    id: "document-media",
    label: "Media file",
    subtitle: "Image, video, or audio",
    title: "",
    description: "",
    kind: "media",
    icon: "perm_media",
  },
  {
    id: "document-pdf",
    label: "PDF file",
    subtitle: "Portable document",
    title: "",
    description: "",
    kind: "pdf",
    icon: "picture_as_pdf",
  },
  {
    id: "document-excel",
    label: "Excel file",
    subtitle: "Spreadsheet document",
    title: "",
    description: "",
    kind: "excel",
    icon: "table_chart",
  },
];

export function documentFileAccept(kind: DocumentKind): string {
  if (kind === "pdf") return ".pdf,application/pdf";
  if (kind === "excel") {
    return ".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
  }
  return "image/*,video/*,audio/*";
}
