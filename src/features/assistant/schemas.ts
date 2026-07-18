import { z } from "zod";

export const klikinActionSchema = z.looseObject({
  type: z.string(),
  route: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  submit: z.boolean().optional(),
  key: z.string().optional(),
  value: z.unknown().optional(),
  target: z.string().optional(),
  operation: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  summary: z.string().optional(),
});

export const klikinAttachmentSchema = z.looseObject({
  filename: z.string(),
  download_url: z.string(),
  row_count: z.number().optional(),
});

export const klikinChatResponseSchema = z.looseObject({
  session_id: z.string(),
  reply: z.string().catch(""),
  actions: z.array(klikinActionSchema).catch([]),
  attachments: z.array(klikinAttachmentSchema).catch([]),
  tool_calls: z.array(z.string()).catch([]),
  history: z.array(z.unknown()).catch([]),
  suggested: z.array(z.string()).optional(),
});

export const klikinConfirmResponseSchema = z.looseObject({
  ok: z.boolean(),
  operation: z.string().optional(),
  summary: z.string().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const klikinReportPreviewSchema = z.looseObject({
  report_id: z.string(),
  report_type: z.string().catch(""),
  title: z.string().catch(""),
  sections: z
    .array(
      z.looseObject({
        heading: z.string().catch(""),
        body: z.string().catch(""),
      }),
    )
    .catch([]),
  markdown: z.string().catch(""),
});

export const klikinReportFileSchema = z.looseObject({
  title: z.string().catch(""),
  filename: z.string(),
  download_url: z.string(),
});

export const klikinReportEmailResultSchema = z.looseObject({
  ok: z.boolean(),
  to: z.array(z.string()).catch([]),
  subject: z.string().catch(""),
  attached: z.string().optional(),
});

export type KlikinAction = z.infer<typeof klikinActionSchema>;
export type KlikinAttachment = z.infer<typeof klikinAttachmentSchema>;
export type KlikinChatResponse = z.infer<typeof klikinChatResponseSchema>;
export type KlikinConfirmResponse = z.infer<typeof klikinConfirmResponseSchema>;
export type KlikinReportPreview = z.infer<typeof klikinReportPreviewSchema>;
export type KlikinReportFile = z.infer<typeof klikinReportFileSchema>;
export type KlikinReportEmailResult = z.infer<typeof klikinReportEmailResultSchema>;
export type KlikinReportFormat = "pdf" | "xlsx" | "md" | "txt";

export type ConfirmationStatus = "idle" | "running" | "done" | "error" | "cancelled";

export interface PendingConfirmation {
  id: string;
  action: KlikinAction;
  status: ConfirmationStatus;
  resultText?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: KlikinAttachment[];
  confirmations?: PendingConfirmation[];
  /** True while the assistant reply is in flight (typing dots). */
  pending?: boolean;
}
