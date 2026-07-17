import type { PhotoPaletteTemplate, QuestionPaletteTemplate } from "./palette-types";

const PHOTO_STORAGE_KEY = "planner.photoPalette.custom";
const QUESTION_STORAGE_KEY = "planner.questionPalette.custom";

function readJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

export function loadCustomPhotoPaletteTemplates(): PhotoPaletteTemplate[] {
  return readJson<PhotoPaletteTemplate>(PHOTO_STORAGE_KEY).map((item) => ({
    ...item,
    custom: true,
  }));
}

export function saveCustomPhotoPaletteTemplates(templates: PhotoPaletteTemplate[]): void {
  writeJson(
    PHOTO_STORAGE_KEY,
    templates.filter((template) => template.custom),
  );
}

export function loadCustomQuestionPaletteTemplates(): QuestionPaletteTemplate[] {
  return readJson<QuestionPaletteTemplate>(QUESTION_STORAGE_KEY).map((item) => ({
    ...item,
    custom: true,
  }));
}

export function saveCustomQuestionPaletteTemplates(
  templates: QuestionPaletteTemplate[],
): void {
  writeJson(
    QUESTION_STORAGE_KEY,
    templates.filter((template) => template.custom),
  );
}
