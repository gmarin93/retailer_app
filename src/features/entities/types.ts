import type { ReactNode } from "react";
import type { BulkLogoEntityKind } from "./schemas";

/**
 * Config-driven entity management, replacing the Angular
 * `AbstractManagerComponent` subclass-per-entity pattern with one generic
 * React manager + a config per entity.
 */

/** A generic v0 entity row — loose payloads keyed by field name. */
export type EntityRecord = { id: number } & Record<string, unknown>;

export interface EntityColumn {
  key: string;
  label: string;
  /** Renders the cell; defaults to the raw field value. */
  getValue?: (record: EntityRecord) => ReactNode;
}

export type EntityFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  /** Nested FK resolved via v2 typeahead; serialized as v0 hyperlink or id. */
  | "entity";

export type EntityRelationRoute = "customers" | "retailers" | "users" | "programs" | "stores";

export interface EntityField {
  name: string;
  label: string;
  type: EntityFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Only shown when creating (e.g. user password). */
  createOnly?: boolean;
  /** Shown but not editable (e.g. locked FKs). */
  readOnly?: boolean;
  /** For `type: "entity"` — which v2 list to search. */
  entityRoute?: EntityRelationRoute;
  /**
   * How to serialize the FK for v0 FormData.
   * `url` = hyperlinked resource (programs/customers); `id` = numeric id.
   */
  relationSerialize?: "url" | "id";
}

/** Optional manager extras beyond v0 CRUD (logos, store priorities). */
export interface EntityExtras {
  /** Header secondary action: bulk logo upload for this entity kind. */
  bulkLogo?: BulkLogoEntityKind;
  /** Stores only: row action opens assign-reps dialog. */
  storePriorities?: boolean;
  /** Stores only: avatar picker in the edit dialog. */
  storeAvatar?: boolean;
  /** Row Active column is an inline checkbox that PATCHes `active`. */
  inlineActive?: boolean;
}

export interface EntityConfig {
  /** Singular + plural display names. */
  singular: string;
  plural: string;
  /** v0 API route, e.g. "cycles". */
  route: string;
  columns: EntityColumn[];
  /** Fields matched against the search query (client-side, like the Angular manager). */
  searchFields: string[];
  /** Form fields for the create/edit dialogs (from the Postable/Patchable models). */
  fields: EntityField[];
  /** Sort applied after load; defaults to title asc. */
  sortField?: string;
  extras?: EntityExtras;
}
