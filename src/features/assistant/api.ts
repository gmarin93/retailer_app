import { env } from "@/shared/lib/env";
import { ApiError } from "@/shared/services/api/errors";
import { useSessionStore } from "@/stores/session-store";
import {
  klikinChatResponseSchema,
  klikinConfirmResponseSchema,
  klikinReportEmailResultSchema,
  klikinReportFileSchema,
  klikinReportPreviewSchema,
  type KlikinChatResponse,
  type KlikinConfirmResponse,
  type KlikinReportEmailResult,
  type KlikinReportFile,
  type KlikinReportFormat,
  type KlikinReportPreview,
} from "./schemas";

function assistantBase(): string {
  if (!env.assistantHost) {
    throw new ApiError("Assistant host is not configured");
  }
  return env.assistantHost.replace(/\/$/, "");
}

/**
 * Assistant requests use the same DRF token but hit a separate host, so they
 * bypass the shared `api` client's own-API allowlist and attach auth here.
 */
async function assistantPost<T>(
  path: string,
  body: unknown,
  parse: (data: unknown) => T,
): Promise<T> {
  const { session } = useSessionStore.getState();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (session?.key) headers.Authorization = `Token ${session.key}`;

  try {
    const response = await fetch(`${assistantBase()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let detail = `Assistant request failed (${response.status})`;
      try {
        const payload = (await response.json()) as { detail?: string };
        if (payload.detail) detail = payload.detail;
      } catch {
        // keep generic message
      }
      throw new ApiError(detail, { status: response.status });
    }
    const data: unknown = await response.json();
    return parse(data);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("A network error occurred. Please check your connection.", {
      cause: error,
    });
  }
}

export async function postAssistantChat(args: {
  message: string;
  sessionId: string | null;
  history: unknown[];
  uiState: { route?: string; filters?: Record<string, string> };
}): Promise<KlikinChatResponse> {
  return assistantPost(
    "/v1/chat",
    {
      message: args.message,
      session_id: args.sessionId,
      history: args.history,
      ui_state: args.uiState,
    },
    (data) => klikinChatResponseSchema.parse(data),
  );
}

export async function postAssistantConfirm(
  operation: string,
  params: Record<string, unknown>,
): Promise<KlikinConfirmResponse> {
  return assistantPost(
    "/v1/actions/confirm",
    { operation, params },
    (data) => klikinConfirmResponseSchema.parse(data),
  );
}

export async function previewAssistantReport(args: {
  history: unknown[];
  reportType: string;
  options: Record<string, boolean>;
  instructions?: string;
}): Promise<KlikinReportPreview> {
  return assistantPost(
    "/v1/reports/preview",
    {
      history: args.history,
      report_type: args.reportType,
      options: args.options,
      instructions: args.instructions || null,
    },
    (data) => klikinReportPreviewSchema.parse(data),
  );
}

export async function renderAssistantReport(
  reportId: string,
  format: KlikinReportFormat,
): Promise<KlikinReportFile> {
  return assistantPost(
    "/v1/reports/render",
    { report_id: reportId, format },
    (data) => klikinReportFileSchema.parse(data),
  );
}

export async function emailAssistantReport(args: {
  reportId: string;
  format: KlikinReportFormat;
  to: string[];
  subject?: string;
  message?: string;
}): Promise<KlikinReportEmailResult> {
  return assistantPost(
    "/v1/reports/email",
    {
      report_id: args.reportId,
      format: args.format,
      to: args.to,
      subject: args.subject || null,
      message: args.message || null,
    },
    (data) => klikinReportEmailResultSchema.parse(data),
  );
}
