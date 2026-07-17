import { env } from "@/shared/lib/env";
import { api, httpClient } from "@/shared/services/api";
import { resultsPageSchema, fetchAllPages } from "@/shared/services/api/pagination";
import type { CustomChargeLine, ListableUserInvoice, ListableInvoice } from "./schemas";
import {
  invoiceableJobPageSchema,
  invoicesVoidResponseSchema,
  jobsInvoiceResponseSchema,
  listableInvoiceSchema,
  listableUserInvoiceSchema,
  userInvoicesRunResponseSchema,
} from "./schemas";

const v2 = `${env.apiHost}/v2`;

// ── User invoices ──────────────────────────────────────────────────────────

export interface FetchUserInvoicesOptions {
  batchIds?: string[];
  billingDate?: string; // YYYY-MM-DD
  userIds?: number[];
}

export async function fetchAllUserInvoices(
  options: FetchUserInvoicesOptions = {},
  signal?: AbortSignal,
): Promise<ListableUserInvoice[]> {
  const baseParams: Record<string, string> = {};
  if (options.batchIds?.length) baseParams.batch_id__in = options.batchIds.join(",");
  if (options.billingDate) baseParams.billing_date = options.billingDate;
  if (options.userIds?.length) baseParams.user__id__in = options.userIds.join(",");

  const pageSchema = resultsPageSchema(listableUserInvoiceSchema);

  return fetchAllPages((page) =>
    api
      .get<unknown>(`${v2}/user_invoices/`, {
        searchParams: { ...baseParams, _page: String(page) },
        signal,
      })
      .then((data) => pageSchema.parse(data)),
  );
}

export interface RunInvoicesPayload {
  batch_id: string;
  users: number[];
  customer_to_invoice: number;
  billing_date: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
}

export async function runUserInvoices(payload: RunInvoicesPayload) {
  const data = await api.post<unknown>(`${v2}/user_invoices/run/`, payload);
  return userInvoicesRunResponseSchema.parse(data);
}

export async function deleteUserInvoice(id: number): Promise<void> {
  await api.delete(`${v2}/user_invoices/${id}/`);
}

/** Downloads the legacy summary blob and triggers a browser download. */
export async function downloadLegacySummary(userInvoiceIds: number[]): Promise<void> {
  const blob = await httpClient
    .post(`${v2}/user_invoices/legacy_summary/`, {
      json: { user_invoices: userInvoiceIds },
      timeout: 120_000,
    })
    .blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "user-invoices-summary";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Customer invoices ──────────────────────────────────────────────────────

export async function fetchCustomerInvoices(signal?: AbortSignal): Promise<ListableInvoice[]> {
  const pageSchema = resultsPageSchema(listableInvoiceSchema);
  return fetchAllPages((page) =>
    api
      .get<unknown>(`${v2}/invoices/`, {
        searchParams: { _page: String(page), _page_size: "200" },
        signal,
      })
      .then((data) => pageSchema.parse(data)),
  );
}

export async function voidCustomerInvoice(invoiceId: number) {
  const data = await api.post<unknown>(`${v2}/invoices/void/`, { invoices: [invoiceId] });
  return invoicesVoidResponseSchema.parse(data);
}

// ── Invoiceable jobs ───────────────────────────────────────────────────────

export interface InvoiceableJobsFilter {
  customers?: number[];
  cycles?: number[];
  programs?: number[];
  page?: number;
  pageSize?: number;
}

export async function fetchInvoiceableJobs(
  filter: InvoiceableJobsFilter = {},
  signal?: AbortSignal,
) {
  const searchParams: Record<string, string> = {};
  if (filter.customers?.length) searchParams.customer__id__in = filter.customers.join(",");
  if (filter.cycles?.length) searchParams.cycle__id__in = filter.cycles.join(",");
  if (filter.programs?.length) searchParams.program__id__in = filter.programs.join(",");
  if (filter.page != null) searchParams._page = String(filter.page + 1); // 1-based
  if (filter.pageSize != null) searchParams._page_size = String(filter.pageSize);

  const data = await api.get<unknown>(`${v2}/jobs/invoiceable/`, { searchParams, signal });
  return invoiceableJobPageSchema.parse(data);
}

// ── Jobs invoice preview / finalize ───────────────────────────────────────

export interface JobsInvoicePayload {
  customer: number;
  billing_date: string; // YYYY-MM-DD
  custom_lines: CustomChargeLine[];
}

function buildFilterQs(filter: InvoiceableJobsFilter): string {
  const params = new URLSearchParams();
  if (filter.customers?.length) params.set("customer__id__in", filter.customers.join(","));
  if (filter.cycles?.length) params.set("cycle__id__in", filter.cycles.join(","));
  if (filter.programs?.length) params.set("program__id__in", filter.programs.join(","));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Requests a PDF preview and opens it in a new tab. */
export async function previewJobsInvoice(
  filter: InvoiceableJobsFilter,
  payload: JobsInvoicePayload,
): Promise<void> {
  const blob = await httpClient
    .post(`${v2}/jobs/invoice_preview/${buildFilterQs(filter)}`, {
      json: payload,
      timeout: 120_000,
    })
    .blob();

  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}

/** Finalizes the invoice and returns the created invoice record. */
export async function finalizeJobsInvoice(
  filter: InvoiceableJobsFilter,
  payload: JobsInvoicePayload,
) {
  const data = await api.post<unknown>(
    `${v2}/jobs/invoice/${buildFilterQs(filter)}`,
    payload,
  );
  return jobsInvoiceResponseSchema.parse(data);
}
