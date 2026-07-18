import { z } from "zod";

export const PROVINCE_OPTIONS: { value: string; label: string }[] = [
  { value: "AB", label: "Alberta (AB)" },
  { value: "BC", label: "British Columbia (BC)" },
  { value: "MB", label: "Manitoba (MB)" },
  { value: "NB", label: "New Brunswick (NB)" },
  { value: "NL", label: "Newfoundland and Labrador (NL)" },
  { value: "NT", label: "Northwest Territories (NT)" },
  { value: "NS", label: "Nova Scotia (NS)" },
  { value: "NU", label: "Nunavut (NU)" },
  { value: "ON", label: "Ontario (ON)" },
  { value: "PE", label: "Prince Edward Island (PE)" },
  { value: "QC", label: "Quebec (QC)" },
  { value: "SK", label: "Saskatchewan (SK)" },
  { value: "YT", label: "Yukon (YT)" },
  { value: "USA", label: "USA" },
  { value: "OTHER", label: "OTHER" },
];

export const DEFAULT_PROVINCE = "ON";

const listableUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  first_name: z.string().nullable().default(""),
  last_name: z.string().nullable().default(""),
  rep_no: z.number().nullable().optional(),
  email: z.string().nullable().optional(),
});
export type ListableUser = z.infer<typeof listableUserSchema>;

export const listableUserInvoiceSchema = z.object({
  id: z.number(),
  batch_id: z.string(),
  billing_date: z.string(),
  period_end: z.string().nullable().optional(),
  user: listableUserSchema,
  count_job_reports: z.number().nullable().optional(),
  total_minutes: z.number().nullable().optional(),
  subtotal: z.union([z.number(), z.string()]).nullable().optional(),
  taxes: z.union([z.number(), z.string()]).nullable().optional(),
  total: z.union([z.number(), z.string()]).nullable().optional(),
  file_location: z.string().nullable().optional(),
  finalized: z.boolean().optional(),
  title: z.string().nullable().optional(),
  customer_to_invoice: z.number().nullable().optional(),
});
export type ListableUserInvoice = z.infer<typeof listableUserInvoiceSchema>;

export const userInvoicesRunResponseSchema = z.object({
  user_invoices: z.array(listableUserInvoiceSchema),
});

export const listableInvoiceSchema = z.object({
  id: z.number(),
  customer: z.object({ id: z.number(), title: z.string() }).nullable().optional(),
  program: z.object({ id: z.number(), title: z.string() }).nullable().optional(),
  num_jobs: z.number().nullable().optional(),
  billing_date: z.string().nullable().optional(),
  total: z.union([z.number(), z.string()]).nullable().optional(),
  voided: z.boolean().optional().default(false),
  location: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
});
export type ListableInvoice = z.infer<typeof listableInvoiceSchema>;

export const invoicesVoidResponseSchema = z.object({
  count_invoices: z.number(),
  count_jobs: z.number(),
});

export const invoiceableJobSchema = z.looseObject({
  id: z.number(),
  customer: z.object({ id: z.number(), title: z.string() }).optional(),
  program: z.object({ id: z.number(), title: z.string() }).nullable().optional(),
  store: z
    .object({
      id: z.number().optional(),
      title: z.string().catch(""),
      store_no: z.union([z.string(), z.number()]).nullish(),
    })
    .nullish(),
});
export type InvoiceableJob = z.infer<typeof invoiceableJobSchema>;

export const invoiceableJobPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(invoiceableJobSchema),
});
export type InvoiceableJobPage = z.infer<typeof invoiceableJobPageSchema>;

export const jobsInvoiceResponseSchema = z.object({
  id: z.number(),
  location: z.string(),
});
export type JobsInvoiceResponse = z.infer<typeof jobsInvoiceResponseSchema>;

/** Custom line on a customer invoice. */
export interface CustomChargeLine {
  name: string;
  date: string; // YYYY-MM-DD
  province: string;
  units: number;
  rate: number;
}

export const CHARGE_TEMPLATES: { label: string; name: string; units: number; rate: number }[] = [
  { label: "Travel", name: "Travel expense", units: 1, rate: 0 },
  { label: "Admin fee", name: "Administrative fee", units: 1, rate: 0 },
  { label: "Rush service", name: "Rush service charge", units: 1, rate: 0 },
  { label: "Materials", name: "Materials reimbursement", units: 1, rate: 0 },
];
