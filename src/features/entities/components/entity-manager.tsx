"use client";

import {
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  Building01Icon,
  Camera01Icon,
  Cancel01Icon,
  ImageAdd01Icon,
  InformationCircleIcon,
  PencilEdit02Icon,
  PlusSignIcon,
  Search01Icon,
  SearchRemoveIcon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { UserAvatar } from "@/shared/components/user/user-avatar";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { getUserDisplayInitials } from "@/shared/lib/user-initials";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/services/api";
import {
  createEntity,
  deleteEntity,
  entityResourceUrl,
  fetchEntityDetail,
  fetchEntityList,
  patchEntity,
} from "../api";
import { patchStoreAvatar } from "../extras-api";
import { useStoreDetailV2 } from "../hooks";
import type { ListableEntityLite } from "../schemas";
import type {
  EntityAvatarKind,
  EntityConfig,
  EntityField,
  EntityRecord,
} from "./../types";
import { BulkLogoUploadDialog } from "./bulk-logo-upload-dialog";
import {
  EntitySearchField,
  formatCustomerOption,
  formatCustomerSelected,
  formatRetailerOption,
  formatRetailerSelected,
  formatStoreOption,
  formatStoreSelected,
  formatUserOption,
  formatUserSelected,
} from "./entity-search-field";
import { StoreUserPrioritiesDialog } from "./store-user-priorities-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500];

function fieldValue(record: EntityRecord | undefined, field: EntityField): string | boolean {
  const raw = record?.[field.name];
  if (field.type === "checkbox") return raw === true;
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

function relationFromRecord(
  record: EntityRecord | undefined,
  field: EntityField,
): ListableEntityLite | null {
  if (field.type !== "entity") return null;
  const raw = record?.[field.name];
  if (!raw || typeof raw !== "object") return null;
  const nested = raw as ListableEntityLite & { url?: string };
  if (typeof nested.id !== "number") return null;
  return nested;
}

function serializeRelation(
  field: EntityField,
  value: ListableEntityLite | null,
): string | number | null {
  if (!value) return null;
  if (field.relationSerialize === "id") return value.id;
  const withUrl = value as ListableEntityLite & { url?: string };
  if (typeof withUrl.url === "string" && withUrl.url) return withUrl.url;
  return entityResourceUrl(field.entityRoute ?? field.name, value.id);
}

function entityFieldFormatters(route: EntityField["entityRoute"]) {
  switch (route) {
    case "customers":
      return { option: formatCustomerOption, selected: formatCustomerSelected };
    case "retailers":
      return { option: formatRetailerOption, selected: formatRetailerSelected };
    case "users":
      return { option: formatUserOption, selected: formatUserSelected };
    case "stores":
      return { option: formatStoreOption, selected: formatStoreSelected };
    default:
      return { option: formatCustomerOption, selected: formatCustomerSelected };
  }
}

function resolveAvatarKind(config: EntityConfig): EntityAvatarKind | null {
  if (config.extras?.avatarUpload) return config.extras.avatarUpload;
  if (config.extras?.storeAvatar) return "store";
  return null;
}

function entityDisplayName(record: EntityRecord | undefined, config: EntityConfig): string {
  if (!record) {
    return config.route === "users" ? "New User" : `New ${config.singular}`;
  }
  if (config.route === "users") {
    const name = `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim();
    return name || String(record.username ?? "User");
  }
  return String(record.title ?? record.code ?? config.singular);
}

function entityDisplayCode(record: EntityRecord | undefined, config: EntityConfig): string {
  if (!record) return "";
  if (config.route === "users") {
    return String(record.username ?? "").toUpperCase();
  }
  if (config.route === "stores") {
    const storeNo = record.store_no != null ? `#${record.store_no}` : "";
    const code = record.code != null ? String(record.code) : "";
    return [storeNo, code].filter(Boolean).join(" · ");
  }
  return String(record.code ?? "").toUpperCase();
}

function entityEditDialogTitle(record: EntityRecord, config: EntityConfig): string {
  const name = entityDisplayName(record, config);
  if (config.route === "users") {
    const username = String(record.username ?? "");
    return username ? `${name} (${username})` : name;
  }
  const code = record.code != null ? String(record.code) : "";
  return code ? `${name} (${code})` : name;
}

function avatarFallbackIcon(kind: EntityAvatarKind): IconSvgElement {
  if (kind === "user") return UserIcon;
  if (kind === "store") return Store01Icon;
  return Building01Icon;
}

/**
 * Angular-parity avatar hero + Choose Avatar control.
 * Stages a file for create/edit; parent form sends it on Save (like Angular attributes).
 */
function EntityAvatarPanel({
  kind,
  avatarUrl,
  title,
  subtitle,
  pendingFile,
  onPendingFile,
}: {
  kind: EntityAvatarKind;
  avatarUrl?: string;
  title: string;
  subtitle?: string;
  pendingFile: File | null;
  onPendingFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl ?? "");
  const previewObjectUrl = useRef<string | null>(null);
  const label = kind === "user" ? "Avatar" : "Logo";

  useEffect(() => {
    if (pendingFile) return;
    setPreview(avatarUrl ?? "");
  }, [avatarUrl, pendingFile]);

  useEffect(
    () => () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    },
    [],
  );

  const pickFile = (file: File) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    const url = URL.createObjectURL(file);
    previewObjectUrl.current = url;
    setPreview(url);
    onPendingFile(file);
  };

  const clearPending = () => {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    onPendingFile(null);
    setPreview(avatarUrl ?? "");
  };

  const initials =
    kind === "user"
      ? getUserDisplayInitials(
          {
            first_name: title.split(" ")[0],
            last_name: title.split(" ").slice(1).join(" "),
            username: subtitle,
          },
          true,
        )
      : title.slice(0, 2).toUpperCase();

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-row items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 shadow-[0_1px_4px_rgba(17,24,39,0.04)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="size-20 shrink-0 rounded-full border-[3px] border-white object-cover shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
          />
        ) : (
          <div
            className={cn(
              "inline-flex size-20 shrink-0 items-center justify-center rounded-full border-[3px] border-white shadow-[0_4px_12px_rgba(15,23,42,0.12)]",
              kind === "user"
                ? "bg-[#fff4d1] text-[28px] font-bold text-[#a65111]"
                : "bg-[#e8eaf6] text-[#4c6fff]",
            )}
            aria-hidden="true"
          >
            {kind === "user" ? (
              initials
            ) : (
              <HugeiconsIcon icon={avatarFallbackIcon(kind)} size={36} strokeWidth={1.5} />
            )}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="m-0 truncate text-xl font-bold tracking-tight text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 m-0 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-11 min-w-[180px] gap-2 uppercase"
          >
            <HugeiconsIcon icon={Camera01Icon} aria-hidden="true" className="size-4" />
            Choose {label}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) pickFile(file);
            }}
          />
        </div>
        {pendingFile && (
          <div className="flex items-center gap-2 pb-2">
            <p className="text-xs text-[#4c6fff]">
              {pendingFile.name} — click Save to update
            </p>
            <button
              type="button"
              onClick={clearPending}
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground focus-visible:outline-none"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Config-driven create/edit form (from the Postable/Patchable model fields). */
function EntityForm({
  config,
  record,
  onSubmit,
  onDelete,
  isPending,
  onCancel,
}: {
  config: EntityConfig;
  /** Present when editing. */
  record?: EntityRecord;
  onSubmit: (changes: Record<string, unknown>) => void;
  onDelete?: () => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const isEdit = record !== undefined;
  const avatarKind = resolveAvatarKind(config);
  const fields = config.fields.filter((field) => !(isEdit && field.createOnly));
  const scalarFields = fields.filter((field) => field.type !== "entity");
  const relationFields = fields.filter((field) => field.type === "entity");
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(scalarFields.map((field) => [field.name, fieldValue(record, field)])),
  );
  const [relations, setRelations] = useState<Record<string, ListableEntityLite | null>>(() =>
    Object.fromEntries(
      relationFields.map((field) => [field.name, relationFromRecord(record, field)]),
    ),
  );
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  // Stores: prefer v2 detail avatar when v0 omits it.
  const storeV2 = useStoreDetailV2(
    avatarKind === "store" && isEdit ? record.id : null,
    avatarKind === "store" && isEdit,
  );
  const avatarUrl =
    (avatarKind === "store" && typeof storeV2.data?.avatar === "string"
      ? storeV2.data.avatar
      : null) ||
    (typeof record?.avatar === "string" ? record.avatar : undefined);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // Only changed fields are sent, mirroring the Angular dirty-field patch.
    const changes: Record<string, unknown> = {};
    for (const field of scalarFields) {
      if (field.readOnly) continue;
      const next = values[field.name];
      const initial = fieldValue(record, field);
      if (isEdit && next === initial) continue;
      if (!isEdit && next === "") continue;
      changes[field.name] = field.type === "checkbox" ? next === true : next;
    }
    for (const field of relationFields) {
      if (field.readOnly) continue;
      const next = relations[field.name] ?? null;
      const initial = relationFromRecord(record, field);
      if (field.required && !next) return;
      if (isEdit && next?.id === initial?.id) continue;
      if (!isEdit && !next) continue;
      const serialized = serializeRelation(field, next);
      if (serialized !== null) changes[field.name] = serialized;
    }
    // Angular attributes: avatar File is part of the dirty patch on Save.
    if (pendingAvatar) changes.avatar = pendingAvatar;
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    onSubmit(changes);
  };

  return (
    <form onSubmit={submit} noValidate>
      {avatarKind && (
        <EntityAvatarPanel
          kind={avatarKind}
          avatarUrl={avatarUrl}
          title={entityDisplayName(record, config)}
          subtitle={entityDisplayCode(record, config) || undefined}
          pendingFile={pendingAvatar}
          onPendingFile={setPendingAvatar}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `entity-${field.name}`;
          if (field.type === "entity" && field.entityRoute) {
            const formatters = entityFieldFormatters(field.entityRoute);
            const selected = relations[field.name] ?? null;
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={id}>{field.label}</Label>
                <EntitySearchField
                  key={selected?.id ?? `${field.name}-empty`}
                  route={field.entityRoute}
                  value={selected}
                  onChange={(value) =>
                    setRelations((current) => ({ ...current, [field.name]: value }))
                  }
                  formatOption={formatters.option}
                  formatSelected={formatters.selected}
                  placeholder={field.label}
                  disabled={field.readOnly}
                  required={field.required}
                  aria-label={field.label}
                />
              </div>
            );
          }
          if (field.type === "checkbox") {
            return (
              <label key={field.name} className="flex items-center gap-2 pt-5 text-sm">
                <input
                  type="checkbox"
                  checked={values[field.name] === true}
                  disabled={field.readOnly}
                  onChange={(event) =>
                    setValues((v) => ({ ...v, [field.name]: event.target.checked }))
                  }
                  className="size-4"
                />
                {field.label}
              </label>
            );
          }
          if (field.type === "select") {
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={id}>{field.label}</Label>
                <Select
                  value={String(values[field.name] ?? "")}
                  onValueChange={(value) => setValues((v) => ({ ...v, [field.name]: value }))}
                  disabled={field.readOnly}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder={field.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          if (field.type === "textarea") {
            return (
              <div key={field.name} className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={id}>{field.label}</Label>
                <textarea
                  id={id}
                  rows={3}
                  value={String(values[field.name] ?? "")}
                  disabled={field.readOnly}
                  onChange={(event) =>
                    setValues((v) => ({ ...v, [field.name]: event.target.value }))
                  }
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            );
          }
          return (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={id}>{field.label}</Label>
              <Input
                id={id}
                type={
                  field.type === "number" ? "number" : field.type === "date" ? "date" : "text"
                }
                value={String(values[field.name] ?? "")}
                disabled={field.readOnly}
                required={field.required}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [field.name]: event.target.value }))
                }
              />
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-4">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            disabled={isPending}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Generic entity manager (the React twin of `AbstractManagerComponent`):
 * client-side search + pagination over the full v0 list, with config-driven
 * create/edit/delete dialogs. `?q=` pre-fills the search (command palette).
 */
export function EntityManager({ config }: { config: EntityConfig }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkLogosOpen, setBulkLogosOpen] = useState(false);
  const [prioritiesStore, setPrioritiesStore] = useState<EntityRecord | null>(null);

  const extras = config.extras;
  const showActionsColumn = extras?.storePriorities === true;

  const bulkLogoLabel =
    extras?.bulkLogo === "store"
      ? "Update stores logo"
      : extras?.bulkLogo === "customer"
        ? "Update customers logo"
        : extras?.bulkLogo === "retailer"
          ? "Update retailers logo"
          : null;

  const addButtonLabel = `Add new ${config.singular.charAt(0).toUpperCase()}${config.singular.slice(1)}`;

  function storePriorityLabel(record: EntityRecord): string {
    const retailer = (record.retailer as { title?: string } | null)?.title ?? "?";
    return `${retailer} #${record.store_no ?? "?"}: ${record.title ?? ""}`;
  }

  const listQuery = useQuery({
    queryKey: ["entities", config.route, "list"],
    queryFn: ({ signal }) => fetchEntityList(config.route, signal),
  });

  const detailQuery = useQuery({
    queryKey: ["entities", config.route, "detail", editingId ?? 0],
    queryFn: ({ signal }) => fetchEntityDetail(config.route, editingId!, signal),
    enabled: editingId !== null,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["entities", config.route, "list"] });
    if (editingId != null) {
      void queryClient.invalidateQueries({
        queryKey: ["entities", config.route, "detail", editingId],
      });
    }
    if (config.route === "stores" && editingId != null) {
      void queryClient.invalidateQueries({
        queryKey: ["entities", "stores", "v2-detail", editingId],
      });
    }
  };

  /** Stores use v2 for avatar; other fields still go through v0. */
  async function persistEntityValues(
    mode: "create" | "patch",
    values: Record<string, unknown>,
  ): Promise<EntityRecord | void> {
    const avatar = values.avatar instanceof File ? values.avatar : null;
    const rest = { ...values };
    if (avatar) delete rest.avatar;

    if (mode === "create") {
      if (config.route === "stores" && avatar) {
        // v0 create first, then attach logo via v2 when an id exists.
        const created = await createEntity(config.route, rest);
        await patchStoreAvatar(created.id, avatar);
        return created;
      }
      return createEntity(config.route, avatar ? { ...rest, avatar } : rest);
    }

    const id = editingId!;
    if (config.route === "stores" && avatar) {
      await patchStoreAvatar(id, avatar);
      if (Object.keys(rest).length === 0) {
        return fetchEntityDetail(config.route, id);
      }
      return patchEntity(config.route, id, rest);
    }
    return patchEntity(config.route, id, avatar ? { ...rest, avatar } : rest);
  }

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => persistEntityValues("create", values),
    onSuccess: () => {
      toast.success(`Successfully created ${config.singular}`);
      setCreating(false);
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? `Failed to create ${config.singular}: ${error.message}`
          : `Failed to create ${config.singular}`,
      ),
  });

  const patchMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => persistEntityValues("patch", values),
    onSuccess: () => {
      toast.success(`Successfully updated ${config.singular}`);
      setEditingId(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? `Failed to update ${config.singular}: ${error.message}`
          : `Failed to update ${config.singular}`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntity(config.route, editingId!),
    onSuccess: () => {
      toast.success(`Successfully deleted ${config.singular}`);
      setEditingId(null);
      void invalidate();
    },
    onError: () => toast.error(`Failed to delete ${config.singular}`),
  });

  const activeToggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      patchEntity(config.route, id, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["entities", config.route, "list"] });
      const previous = queryClient.getQueryData<EntityRecord[]>([
        "entities",
        config.route,
        "list",
      ]);
      queryClient.setQueryData<EntityRecord[]>(
        ["entities", config.route, "list"],
        (current) =>
          current?.map((row) => (row.id === id ? { ...row, active } : row)) ?? current,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["entities", config.route, "list"], context.previous);
      }
      toast.error(
        error instanceof ApiError
          ? `Failed to update active: ${error.message}`
          : "Failed to update active",
      );
    },
  });

  const filtered = useMemo(() => {
    const all = listQuery.data ?? [];
    const sortField = config.sortField ?? "title";
    const sorted = [...all].sort((a, b) =>
      String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? ""), undefined, {
        sensitivity: "base",
      }),
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((record) =>
      config.searchFields.some((field) =>
        String(record[field] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [listQuery.data, search, config]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const rowFrom = filtered.length === 0 ? 0 : pageIndex * pageSize + 1;
  const rowTo =
    filtered.length === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, filtered.length);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount && filtered.length > 0;

  return (
    <TooltipProvider>
      <div className="box-border flex min-h-0 flex-1 flex-col gap-4">
        {/* Header card */}
        <div className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-x-6 gap-y-4 rounded-xl border border-[#e6ebf3] bg-white px-6 py-5 shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border dark:bg-card">
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-row items-center gap-2">
              <h1 className="m-0 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#202224] dark:text-foreground">
                {config.plural}
              </h1>
              {config.infoTooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-[#4c6fff] opacity-85 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35"
                      aria-label={config.infoTooltip}
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.8} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{config.infoTooltip}</TooltipContent>
                </Tooltip>
              )}
            </div>
            {config.subtitle && (
              <p className="mt-1.5 mb-0 max-w-[52ch] text-[13.5px] leading-snug text-[#6b7a99] dark:text-muted-foreground">
                {config.subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-row flex-wrap items-center gap-2">
            {bulkLogoLabel && extras?.bulkLogo && (
              <button
                type="button"
                onClick={() => setBulkLogosOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#d9e0ed] bg-white px-4 text-[13px] font-semibold tracking-wide text-[#202224] transition-colors hover:bg-[#f8faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/30 dark:border-border dark:bg-transparent dark:text-foreground"
              >
                <HugeiconsIcon icon={ImageAdd01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
                {bulkLogoLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#4c6fff] px-4 text-[13px] font-semibold tracking-wide text-white uppercase shadow-[0_1px_3px_rgba(76,111,255,0.25)] transition-colors hover:bg-[#3a5cf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
              {addButtonLabel}
            </button>
          </div>
        </div>

        {/* Search toolbar card */}
        <div className="flex shrink-0 flex-row flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-[#e6ebf3] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border dark:bg-card">
          <div className="relative w-full max-w-[360px] shrink-0">
            <HugeiconsIcon
              icon={Search01Icon}
              aria-hidden="true"
              className="absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-[#6b7a99]"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageIndex(0);
              }}
              placeholder="Search records…"
              aria-label={`Search ${config.plural.toLowerCase()}`}
              className="h-11 rounded-full border-[#d9e0ed] bg-[#f8faff] pr-9 pl-10 text-[15px] text-[#202224] placeholder:text-[#90a1c2] focus-visible:border-[#4c6fff] focus-visible:ring-[#4c6fff]/20 dark:bg-background dark:text-foreground"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPageIndex(0);
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6b7a99] hover:text-[#202224] focus-visible:outline-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
          <div className="ml-auto flex flex-row items-center gap-2.5">
            {!listQuery.isLoading && !listQuery.isError && (
              <span className="inline-flex items-center rounded-full border border-[#e6ebf3] bg-[#f0f3f9] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[#6b7a99] dark:border-border dark:bg-muted dark:text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </span>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[#e6ebf3] bg-white shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border dark:bg-card">
          {listQuery.isLoading ? (
            <LoadingState
              label={`Loading ${config.plural.toLowerCase()}…`}
              className="min-h-60"
            />
          ) : listQuery.isError ? (
            <div className="p-6">
              <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
            </div>
          ) : (
            <div className="h-full min-h-[280px] overflow-auto">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center text-sm text-[#6b7a99]">
                  <HugeiconsIcon
                    icon={SearchRemoveIcon}
                    size={40}
                    strokeWidth={1.4}
                    className="text-[#90a1c2]"
                  />
                  <span className="max-w-[36ch] leading-relaxed">
                    No {config.plural.toLowerCase()} found.
                  </span>
                </div>
              ) : (
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-[1]">
                    <tr className="h-12">
                      {config.columns.map((column) => (
                        <th
                          key={column.key}
                          className="bg-[#eef3ff] px-4 text-[12.5px] font-semibold tracking-[0.02em] text-[#3d4f6f] uppercase shadow-[0_1px_0_0_#d9e0ed] dark:bg-[#1e2540] dark:text-foreground"
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="w-20 bg-[#eef3ff] px-3 shadow-[0_1px_0_0_#d9e0ed] dark:bg-[#1e2540]" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record) => (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-[#f8faff] dark:hover:bg-accent/40"
                      >
                        {config.columns.map((column) => (
                          <td
                            key={column.key}
                            className="border-b border-[#f0f3f9] px-4 py-3 text-sm text-[#202224] dark:border-border dark:text-foreground"
                          >
                            {column.key === "avatar" ? (
                              <div onClick={(event) => event.stopPropagation()}>
                                <UserAvatar
                                  user={{
                                    id: record.id,
                                    username: String(record.username ?? ""),
                                    first_name:
                                      typeof record.first_name === "string"
                                        ? record.first_name
                                        : null,
                                    last_name:
                                      typeof record.last_name === "string"
                                        ? record.last_name
                                        : null,
                                    avatar:
                                      typeof record.avatar === "string" ? record.avatar : null,
                                    role:
                                      typeof record.role === "string" ? record.role : null,
                                    email:
                                      typeof record.email === "string" ? record.email : null,
                                    rep_no:
                                      typeof record.rep_no === "string" ||
                                      typeof record.rep_no === "number"
                                        ? record.rep_no
                                        : null,
                                  }}
                                  size={32}
                                />
                              </div>
                            ) : extras?.inlineActive && column.key === "active" ? (
                              <input
                                type="checkbox"
                                checked={record.active === true}
                                aria-label={`Active ${config.singular} ${record.id}`}
                                className="size-4 accent-[#4c6fff]"
                                onChange={(event) =>
                                  activeToggleMutation.mutate({
                                    id: record.id,
                                    active: event.target.checked,
                                  })
                                }
                              />
                            ) : column.getValue ? (
                              column.getValue(record)
                            ) : (
                              String(record[column.key] ?? "—")
                            )}
                          </td>
                        ))}
                        <td className="border-b border-[#f0f3f9] px-2 py-2 dark:border-border">
                          <div className="flex flex-row items-center justify-end gap-0.5">
                            {showActionsColumn && (
                              <button
                                type="button"
                                aria-label="Assign reps to this store"
                                title="Assign reps to this store"
                                onClick={() => setPrioritiesStore(record)}
                                className="inline-flex size-9 items-center justify-center rounded-lg text-[#4c6fff] transition-colors hover:bg-[#eaeffe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/30"
                              >
                                <HugeiconsIcon icon={UserIcon} size={18} strokeWidth={1.8} />
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Edit ${config.singular}`}
                              title="Edit"
                              onClick={() => setEditingId(record.id)}
                              className="inline-flex size-9 items-center justify-center rounded-lg text-[#4c6fff] transition-colors hover:bg-[#eaeffe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/30"
                            >
                              <HugeiconsIcon icon={PencilEdit02Icon} size={18} strokeWidth={1.8} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Bottom pagination toolbar */}
        {!listQuery.isLoading && !listQuery.isError && (
          <div className="flex shrink-0 flex-row flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#e6ebf3] bg-white px-4 py-2.5 shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border dark:bg-card">
            <span className="text-[12.5px] font-medium text-[#6b7a99] dark:text-muted-foreground">
              Showing {rowFrom}-{rowTo} of {filtered.length}
            </span>
            <div className="flex-1" />
            <div className="flex flex-row flex-wrap items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Rows per page"
                  className="h-8 min-w-[4.5rem] border-[#d9e0ed] bg-white dark:bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-0.5">
                {(
                  [
                    {
                      label: "First page",
                      icon: ArrowLeftDoubleIcon,
                      disabled: !canPrev,
                      onClick: () => setPageIndex(0),
                    },
                    {
                      label: "Previous page",
                      icon: ArrowLeft01Icon,
                      disabled: !canPrev,
                      onClick: () => setPageIndex(pageIndex - 1),
                    },
                    {
                      label: "Next page",
                      icon: ArrowRight01Icon,
                      disabled: !canNext,
                      onClick: () => setPageIndex(pageIndex + 1),
                    },
                    {
                      label: "Last page",
                      icon: ArrowRightDoubleIcon,
                      disabled: !canNext,
                      onClick: () => setPageIndex(pageCount - 1),
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    aria-label={item.label}
                    disabled={item.disabled}
                    onClick={item.onClick}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-md text-[#6b7a99] transition-colors hover:bg-[#f0f3f9] hover:text-[#202224] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/30 disabled:pointer-events-none disabled:opacity-35 dark:hover:bg-muted",
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {config.route === "users" ? "Create User" : `Add ${config.singular}`}
              </DialogTitle>
            </DialogHeader>
            <EntityForm
              config={config}
              isPending={createMutation.isPending}
              onCancel={() => setCreating(false)}
              onSubmit={(values) => createMutation.mutate(values)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {detailQuery.data
                  ? entityEditDialogTitle(detailQuery.data, config)
                  : `Edit ${config.singular}`}
              </DialogTitle>
              {!detailQuery.data && (
                <DialogDescription>#{editingId}</DialogDescription>
              )}
            </DialogHeader>
            {detailQuery.isLoading || !detailQuery.data ? (
              <LoadingState label="Loading…" />
            ) : (
              <EntityForm
                // Remount when the detail arrives so initial values apply.
                key={detailQuery.data.id}
                config={config}
                record={detailQuery.data}
                isPending={patchMutation.isPending || deleteMutation.isPending}
                onCancel={() => setEditingId(null)}
                onSubmit={(values) => patchMutation.mutate(values)}
                onDelete={() => setConfirmDelete(true)}
              />
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${config.singular}`}
          question={`Are you sure you want to delete this ${config.singular}? This cannot be undone.`}
          destructive
          onConfirm={() => deleteMutation.mutate()}
        />

        {extras?.bulkLogo && (
          <BulkLogoUploadDialog
            open={bulkLogosOpen}
            onOpenChange={setBulkLogosOpen}
            entityKind={extras.bulkLogo}
            onSuccess={() => void invalidate()}
          />
        )}

        {extras?.storePriorities && (
          <StoreUserPrioritiesDialog
            open={prioritiesStore !== null}
            onOpenChange={(open) => !open && setPrioritiesStore(null)}
            storeId={prioritiesStore?.id ?? null}
            storeLabel={prioritiesStore ? storePriorityLabel(prioritiesStore) : ""}
            onSuccess={() => void invalidate()}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
