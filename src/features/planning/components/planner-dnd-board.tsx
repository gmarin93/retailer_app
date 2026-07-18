"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Camera01Icon,
  CameraAdd01Icon,
  Cancel01Icon,
  CheckListIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  FileSpreadsheetIcon,
  HelpCircleIcon,
  Image01Icon,
  InputShortTextIcon,
  Pdf01Icon,
  PinIcon,
  PlusSignIcon,
  RadioButtonIcon,
  ShopSignIcon,
  Store01Icon,
  ToggleOnIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useState, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  PLAN_DROP_ZONE_ID,
  paletteDragId,
  resolveInsertIndex,
  type PaletteDragData,
  type RowDragData,
} from "../dnd-utils";

interface PaletteItem {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  custom?: boolean;
}

interface PlannerDndBoardProps<TTemplate extends PaletteItem> {
  /** Accessible name for the library aside. */
  libraryAriaLabel: string;
  /** Accessible name for the plan drop panel. */
  dropPanelAriaLabel: string;
  /** Noun used in empty-state copy, e.g. "photo". */
  itemNoun: string;
  templates: TTemplate[];
  /** react-hook-form field array ids (stable per row). */
  rowIds: string[];
  disabled?: boolean;
  onAddCustom?: () => void;
  onRemoveCustom?: (id: string) => void;
  onInsertFromTemplate: (template: TTemplate, index: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemoveRow: (index: number) => void;
  /** Row title shown in the card header, e.g. "Description for photo 1". */
  rowTitle: (index: number) => string;
  renderRow: (index: number) => ReactNode;
}

const PALETTE_ICONS: Record<string, IconSvgElement> = {
  photo_camera: Camera01Icon,
  storefront: Store01Icon,
  signpost: ShopSignIcon,
  add_a_photo: CameraAdd01Icon,
  short_text: InputShortTextIcon,
  toggle_on: ToggleOnIcon,
  checklist: CheckListIcon,
  radio_button_checked: RadioButtonIcon,
  pin: PinIcon,
  help_outline: HelpCircleIcon,
  perm_media: Image01Icon,
  picture_as_pdf: Pdf01Icon,
  table_chart: FileSpreadsheetIcon,
};

function PaletteIcon({ name }: { name: string }) {
  const icon = PALETTE_ICONS[name] ?? Image01Icon;
  return (
    <HugeiconsIcon icon={icon} className="size-5 shrink-0 text-primary" aria-hidden="true" />
  );
}

function PaletteItemCard({
  template,
  disabled,
  onRemoveCustom,
  dragging = false,
}: {
  template: PaletteItem;
  disabled?: boolean;
  onRemoveCustom?: (id: string) => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] border bg-card px-3 py-2.5 text-left transition-[border-color,box-shadow,background] duration-150",
        template.custom && "border-dashed",
        dragging
          ? "cursor-grabbing border-primary shadow-md"
          : "cursor-grab hover:border-primary hover:shadow-[0_2px_8px_rgba(76,111,255,0.12)]",
        disabled && "cursor-not-allowed opacity-50 hover:border-border hover:shadow-none",
      )}
    >
      <PaletteIcon name={template.icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {template.label}
        </span>
        <span className="truncate text-[11px] leading-snug text-muted-foreground">
          {template.subtitle}
        </span>
      </span>
      {template.custom && onRemoveCustom ? (
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={disabled}
          aria-label={`Remove ${template.label} from library`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveCustom(template.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      ) : null}
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="size-5 shrink-0 text-muted-foreground/60"
        aria-hidden="true"
      />
    </div>
  );
}

function DraggablePaletteItem<TTemplate extends PaletteItem>({
  template,
  disabled,
  onRemoveCustom,
}: {
  template: TTemplate;
  disabled?: boolean;
  onRemoveCustom?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(template.id),
    disabled,
    data: { source: "palette", template } satisfies PaletteDragData<TTemplate>,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
      role="listitem"
      aria-label={template.label}
    >
      <PaletteItemCard
        template={template}
        disabled={disabled}
        onRemoveCustom={onRemoveCustom}
      />
    </div>
  );
}

function SortablePlanRow({
  id,
  index,
  title,
  disabled,
  onRemove,
  children,
}: {
  id: string;
  index: number;
  title: string;
  disabled?: boolean;
  onRemove: () => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    data: { source: "row", index } satisfies RowDragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm",
        isDragging && "opacity-35 border-dashed border-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "cursor-not-allowed opacity-50",
            )}
            disabled={disabled}
            aria-label={`Drag to reorder ${title}`}
            title="Drag to reorder"
            {...listeners}
            {...attributes}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            aria-label={`Remove ${title}`}
            title="Remove"
            onClick={onRemove}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

const planCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    // Prefer row targets over the wrapping drop zone so inserts land at index.
    const rowHits = pointerHits.filter((hit) => hit.id !== PLAN_DROP_ZONE_ID);
    return rowHits.length > 0 ? rowHits : pointerHits;
  }
  return closestCenter(args);
};

function PlanDropSurface({
  itemNoun,
  rowIds,
  disabled,
  isDraggingOver,
  rowTitle,
  onRemoveRow,
  renderRow,
}: {
  itemNoun: string;
  rowIds: string[];
  disabled?: boolean;
  isDraggingOver: boolean;
  rowTitle: (index: number) => string;
  onRemoveRow: (index: number) => void;
  renderRow: (index: number) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: PLAN_DROP_ZONE_ID,
    disabled,
  });
  const highlighted = isDraggingOver || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] flex-1 flex-col gap-2.5 rounded-xl border border-dashed bg-muted/40 p-2.5 transition-[border-color,background] duration-150",
        highlighted && "border-primary bg-primary-soft/60",
        disabled && "opacity-60",
      )}
    >
      {rowIds.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
          Drag a {itemNoun} type from the library and drop it here.
        </div>
      ) : (
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {rowIds.map((id, index) => (
            <SortablePlanRow
              key={id}
              id={id}
              index={index}
              title={rowTitle(index)}
              disabled={disabled}
              onRemove={() => onRemoveRow(index)}
            >
              {renderRow(index)}
            </SortablePlanRow>
          ))}
        </SortableContext>
      )}
    </div>
  );
}

/**
 * Two-column library ↔ plan drop board matching Angular PlannerWidget CDK DnD.
 * Dropping from the library copies a template into the plan list; dragging rows
 * reorders. No API call on drop — persistence stays on Save.
 */
export function PlannerDndBoard<TTemplate extends PaletteItem>({
  libraryAriaLabel,
  dropPanelAriaLabel,
  itemNoun,
  templates,
  rowIds,
  disabled = false,
  onAddCustom,
  onRemoveCustom,
  onInsertFromTemplate,
  onReorder,
  onRemoveRow,
  rowTitle,
  renderRow,
}: PlannerDndBoardProps<TTemplate>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activePalette, setActivePalette] = useState<TTemplate | null>(null);
  const [draggingOverPlan, setDraggingOverPlan] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    const data = event.active.data.current as
      | PaletteDragData<TTemplate>
      | RowDragData
      | undefined;
    if (data?.source === "palette") {
      setActivePalette(data.template);
    } else {
      setActivePalette(null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id;
    if (!overId) {
      setDraggingOverPlan(false);
      return;
    }
    setDraggingOverPlan(
      overId === PLAN_DROP_ZONE_ID || rowIds.includes(String(overId)),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setActivePalette(null);
    setDraggingOverPlan(false);
    if (!over || disabled) return;

    const activeData = active.data.current as
      | PaletteDragData<TTemplate>
      | RowDragData
      | undefined;

    if (activeData?.source === "palette") {
      const insertAt = resolveInsertIndex(over.id, rowIds);
      onInsertFromTemplate(activeData.template, insertAt);
      return;
    }

    if (activeData?.source === "row") {
      if (active.id === over.id) return;
      const from = rowIds.indexOf(String(active.id));
      const to =
        over.id === PLAN_DROP_ZONE_ID
          ? rowIds.length - 1
          : rowIds.indexOf(String(over.id));
      if (from < 0 || to < 0 || from === to) return;
      onReorder(from, to);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setActivePalette(null);
    setDraggingOverPlan(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={planCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] md:gap-4">
        <aside
          className="flex h-full min-w-0 flex-col rounded-[14px] border bg-muted/40 p-3.5 max-md:max-h-52 max-md:overflow-y-auto"
          aria-label={libraryAriaLabel}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="m-0 text-[15px] font-semibold text-foreground">Library</h3>
            {onAddCustom ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={disabled}
                onClick={onAddCustom}
                aria-label={`Add ${itemNoun} type to library`}
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-3.5"
                  data-icon="inline-start"
                />
                Add type
              </Button>
            ) : null}
          </div>
          <p className="mb-3 text-xs leading-snug text-muted-foreground">
            Drag a type into the plan list.
          </p>
          <div className="flex min-h-12 flex-col gap-2" role="list">
            {templates.map((template) => (
              <DraggablePaletteItem
                key={template.id}
                template={template}
                disabled={disabled}
                onRemoveCustom={onRemoveCustom}
              />
            ))}
          </div>
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-col gap-2"
          aria-label={dropPanelAriaLabel}
        >
          <p className="m-0 shrink-0 text-[13px] leading-snug text-muted-foreground">
            Drop here to add. Drag the row handle to reorder.
          </p>
          <PlanDropSurface
            itemNoun={itemNoun}
            rowIds={rowIds}
            disabled={disabled}
            isDraggingOver={draggingOverPlan && activeId != null}
            rowTitle={rowTitle}
            onRemoveRow={onRemoveRow}
            renderRow={renderRow}
          />
        </section>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePalette ? (
          <div className="w-[260px]">
            <PaletteItemCard template={activePalette} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
