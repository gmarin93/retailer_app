"use client";

import {
  Cancel01Icon,
  ImageAdd01Icon,
  PlusSignIcon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { ApiError } from "@/shared/services/api";
import {
  createEntity,
  deleteEntity,
  entityResourceUrl,
  fetchEntityDetail,
  fetchEntityList,
  patchEntity,
} from "../api";
import { usePatchStoreAvatar } from "../hooks";
import type { ListableEntityLite } from "../schemas";
import type { EntityConfig, EntityField, EntityRecord } from "./../types";
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

function StoreAvatarSection({ storeId, avatarUrl }: { storeId: number; avatarUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = usePatchStoreAvatar();
  const [preview, setPreview] = useState(avatarUrl ?? "");

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border p-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="size-14 rounded object-cover bg-muted" />
      ) : (
        <div className="flex size-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
          Logo
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">Store logo</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <HugeiconsIcon icon={ImageAdd01Icon} aria-hidden="true" className="size-4" />
          {mutation.isPending ? "Uploading…" : "Change logo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const url = URL.createObjectURL(file);
            setPreview(url);
            mutation.mutate(
              { id: storeId, file },
              {
                onError: () => {
                  URL.revokeObjectURL(url);
                  setPreview(avatarUrl ?? "");
                },
              },
            );
          }}
        />
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
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    onSubmit(changes);
  };

  return (
    <form onSubmit={submit} noValidate>
      {isEdit && config.extras?.storeAvatar && record && (
        <StoreAvatarSection
          storeId={record.id}
          avatarUrl={typeof record.avatar === "string" ? record.avatar : undefined}
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
          ? "Update retailer logos"
          : null;

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["entities", config.route, "list"] });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createEntity(config.route, values),
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
    mutationFn: (values: Record<string, unknown>) =>
      patchEntity(config.route, editingId!, values),
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={config.plural}
        actions={
          <>
            {bulkLogoLabel && extras?.bulkLogo && (
              <Button size="sm" variant="outline" onClick={() => setBulkLogosOpen(true)}>
                <HugeiconsIcon icon={ImageAdd01Icon} aria-hidden="true" className="size-4" />
                {bulkLogoLabel}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreating(true)}>
              <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" className="size-4" />
              Add {config.singular}
            </Button>
          </>
        }
      />

      <div className="relative w-64">
        <HugeiconsIcon
          icon={Search01Icon}
          aria-hidden="true"
          className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPageIndex(0);
          }}
          placeholder="Search"
          aria-label={`Search ${config.plural.toLowerCase()}`}
          className="pl-8"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      {listQuery.isLoading ? (
        <LoadingState label={`Loading ${config.plural.toLowerCase()}…`} className="min-h-60" />
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  {showActionsColumn && <TableHead className="w-28">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={config.columns.length + (showActionsColumn ? 1 : 0)}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No {config.plural.toLowerCase()} found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((record) => (
                    <TableRow
                      key={record.id}
                      onClick={() => setEditingId(record.id)}
                      className="cursor-pointer"
                    >
                      {config.columns.map((column) => (
                        <TableCell key={column.key}>
                          {extras?.inlineActive && column.key === "active" ? (
                            <input
                              type="checkbox"
                              checked={record.active === true}
                              aria-label={`Active ${config.singular} ${record.id}`}
                              className="size-4"
                              onClick={(event) => event.stopPropagation()}
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
                        </TableCell>
                      ))}
                      {showActionsColumn && (
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Assign reps to this store"
                            onClick={() => setPrioritiesStore(record)}
                          >
                            <HugeiconsIcon icon={UserIcon} aria-hidden="true" className="size-4" />
                            Assign
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger size="sm" aria-label="Rows per page">
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
            </div>
            <div className="flex items-center gap-2">
              <span>
                Page {Math.min(pageIndex + 1, pageCount)} of {pageCount} · {filtered.length}{" "}
                {config.plural.toLowerCase()}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(pageIndex - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex + 1 >= pageCount}
                onClick={() => setPageIndex(pageIndex + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add {config.singular}</DialogTitle>
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
            <DialogTitle>Edit {config.singular}</DialogTitle>
            <DialogDescription>#{editingId}</DialogDescription>
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
  );
}
