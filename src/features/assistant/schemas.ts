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

export type KlikinAction = z.infer<typeof klikinActionSchema>;
export type KlikinAttachment = z.infer<typeof klikinAttachmentSchema>;
export type KlikinChatResponse = z.infer<typeof klikinChatResponseSchema>;
export type KlikinConfirmResponse = z.infer<typeof klikinConfirmResponseSchema>;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: KlikinAttachment[];
  confirmations?: KlikinAction[];
  suggested?: string[];
}
