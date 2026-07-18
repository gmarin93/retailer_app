import { USER_ROLE_LABELS } from "@/features/auth/types";
import type { EntityConfig, EntityRecord } from "./types";

/**
 * Per-entity manager configs, ported from the `*-manager.component.ts` column
 * sets and the Postable/Patchable model fields. CSV import remains deferred
 * (see MIGRATION_PLAN.md).
 */

const activeCell = (record: EntityRecord) => (record.active === true ? "Yes" : "No");

/** Angular generic-manager date cells: `MMM DD, YYYY`. */
function formatDateCell(value: unknown): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export const cyclesConfig: EntityConfig = {
  singular: "cycle",
  plural: "Cycles",
  subtitle: "Organize visit cycles and keep scheduling periods up to date.",
  infoTooltip: "Cycle management",
  route: "cycles",
  sortField: "code",
  columns: [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    {
      key: "starts_on",
      label: "Starts",
      getValue: (r) => formatDateCell(r.starts_on),
    },
    {
      key: "ends_on",
      label: "Ends",
      getValue: (r) => formatDateCell(r.ends_on),
    },
  ],
  searchFields: ["code", "title"],
  fields: [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "starts_on", label: "Starts on", type: "date" },
    { name: "ends_on", label: "Ends on", type: "date" },
    { name: "active", label: "Active", type: "checkbox" },
  ],
};

export const customersConfig: EntityConfig = {
  singular: "customer",
  plural: "Customers",
  subtitle: "Manage customer accounts, logos, and profile information.",
  infoTooltip: "Customer management",
  route: "customers",
  columns: [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    { key: "active", label: "Active", getValue: activeCell },
  ],
  searchFields: ["code", "title", "legal_name"],
  fields: [
    { name: "code", label: "Code", type: "text" },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "legal_name", label: "Legal name", type: "text" },
    { name: "budget", label: "Budget", type: "number" },
    { name: "rate", label: "Rate", type: "number" },
    { name: "project_rate", label: "Project rate", type: "number" },
    { name: "phone_number", label: "Phone", type: "text" },
    { name: "email_address", label: "Email", type: "text" },
    { name: "address1", label: "Address 1", type: "text" },
    { name: "address2", label: "Address 2", type: "text" },
    { name: "city", label: "City", type: "text" },
    { name: "province", label: "Province", type: "text" },
    { name: "postal_code", label: "Postal code", type: "text" },
    { name: "active", label: "Active", type: "checkbox" },
  ],
  extras: { bulkLogo: "customer", avatarUpload: "customer" },
};

export const retailersConfig: EntityConfig = {
  singular: "retailer",
  plural: "Retailers",
  subtitle: "Manage retailer profiles, branding, and account details.",
  infoTooltip: "Retailer management",
  route: "retailers",
  columns: [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    { key: "active", label: "Active", getValue: activeCell },
  ],
  searchFields: ["code", "title"],
  fields: [
    { name: "code", label: "Code", type: "text" },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "active", label: "Active", type: "checkbox" },
  ],
  extras: { bulkLogo: "retailer", avatarUpload: "retailer" },
};

export const programsConfig: EntityConfig = {
  singular: "program",
  plural: "Programs",
  subtitle: "Create and maintain programs linked to your field operations.",
  infoTooltip: "Program management",
  route: "programs",
  columns: [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    {
      key: "customer",
      label: "Customer",
      getValue: (r) => (r.customer as { title?: string } | null)?.title ?? "—",
    },
    {
      key: "retailer",
      label: "Retailer",
      getValue: (r) => (r.retailer as { title?: string } | null)?.title ?? "—",
    },
    { key: "active", label: "Active", getValue: activeCell },
  ],
  searchFields: ["code", "title"],
  fields: [
    { name: "code", label: "Code", type: "text" },
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "customer",
      label: "Customer",
      type: "entity",
      entityRoute: "customers",
      relationSerialize: "url",
      required: true,
    },
    {
      name: "retailer",
      label: "Retailer",
      type: "entity",
      entityRoute: "retailers",
      relationSerialize: "url",
      required: true,
    },
    { name: "rate", label: "Rate", type: "number" },
    { name: "invoice_label", label: "Invoice label", type: "text" },
    { name: "do_not_invoice", label: "Do not invoice", type: "checkbox" },
    { name: "exclude_from_fill_rate", label: "Exclude from fill rate", type: "checkbox" },
    { name: "active", label: "Active", type: "checkbox" },
  ],
};

export const usersConfig: EntityConfig = {
  singular: "user",
  plural: "Users",
  subtitle: "Browse, search, and manage team accounts and roles.",
  infoTooltip: "User management",
  route: "users",
  sortField: "first_name",
  columns: [
    { key: "avatar", label: "" },
    {
      key: "name",
      label: "Name",
      getValue: (r) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—",
    },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      getValue: (r) =>
        USER_ROLE_LABELS[r.role as keyof typeof USER_ROLE_LABELS] ?? String(r.role ?? "—"),
    },
    {
      key: "is_active",
      label: "Active",
      getValue: (r) => (r.is_active === true ? "Yes" : "No"),
    },
  ],
  searchFields: ["first_name", "last_name", "username", "email", "rep_no"],
  fields: [
    { name: "username", label: "Username", type: "text", required: true },
    { name: "password", label: "Password", type: "text", createOnly: true },
    { name: "first_name", label: "First name", type: "text" },
    { name: "last_name", label: "Last name", type: "text" },
    {
      name: "role",
      label: "Role",
      type: "select",
      options: Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { name: "position", label: "Position", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "phone_number", label: "Phone", type: "text" },
    { name: "rep_no", label: "Rep #", type: "number" },
    { name: "rate", label: "Rate", type: "number" },
    { name: "max_hours", label: "Max hours", type: "number" },
    { name: "is_employee", label: "Employee", type: "checkbox" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ],
  extras: { avatarUpload: "user" },
};

export const storesConfig: EntityConfig = {
  singular: "store",
  plural: "Stores",
  infoTooltip: "Stores management",
  route: "stores",
  sortField: "store_no",
  columns: [
    {
      key: "retailer_title",
      label: "Retailer",
      getValue: (r) => (r.retailer as { title?: string } | null)?.title ?? "—",
    },
    { key: "store_no", label: "Store #" },
    { key: "code", label: "Store code" },
    { key: "title", label: "Store title" },
    { key: "city", label: "City" },
    { key: "province", label: "Province" },
    { key: "active", label: "Active", getValue: activeCell },
  ],
  searchFields: ["store_no", "code", "title", "city", "province"],
  fields: [
    {
      name: "retailer",
      label: "Retailer",
      type: "entity",
      entityRoute: "retailers",
      relationSerialize: "url",
      required: true,
    },
    { name: "store_no", label: "Store #", type: "text" },
    { name: "code", label: "Store code", type: "text" },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "address1", label: "Address 1", type: "text" },
    { name: "address2", label: "Address 2", type: "text" },
    { name: "city", label: "City", type: "text" },
    { name: "province", label: "Province", type: "text" },
    { name: "postal_code", label: "Postal code", type: "text" },
    { name: "phone_number", label: "Phone", type: "text" },
    { name: "email_address", label: "Email", type: "text" },
    { name: "latitude", label: "Latitude", type: "number" },
    { name: "longitude", label: "Longitude", type: "number" },
    { name: "active", label: "Active", type: "checkbox" },
  ],
  extras: {
    bulkLogo: "store",
    storePriorities: true,
    avatarUpload: "store",
    storeAvatar: true,
    inlineActive: true,
  },
};

export const ENTITY_CONFIGS = {
  users: usersConfig,
  stores: storesConfig,
  programs: programsConfig,
  customers: customersConfig,
  retailers: retailersConfig,
  cycles: cyclesConfig,
} as const;

export type EntityKey = keyof typeof ENTITY_CONFIGS;
