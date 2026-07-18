/** Droppable id for the plan list surface (palette → plan insert target). */
export const PLAN_DROP_ZONE_ID = "plan-drop-zone";

export type PaletteDragData<TTemplate> = {
  source: "palette";
  template: TTemplate;
};

export type RowDragData = {
  source: "row";
  index: number;
};

export function paletteDragId(templateId: string): string {
  return `palette:${templateId}`;
}

/**
 * Resolve where a palette item should be inserted, mirroring Angular CDK
 * `currentIndex` clamping into `[0, length]`.
 */
export function resolveInsertIndex(
  overId: string | number,
  rowIds: string[],
  dropZoneId: string = PLAN_DROP_ZONE_ID,
): number {
  if (overId === dropZoneId) {
    return rowIds.length;
  }
  const index = rowIds.indexOf(String(overId));
  if (index < 0) return rowIds.length;
  return Math.min(Math.max(index, 0), rowIds.length);
}
