import { HTTPError, TimeoutError } from "ky";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/**
 * Normalized API error. Every failure thrown by the API layer is converted to
 * this shape so callers never need to know about ky/fetch internals.
 */
export class ApiError extends Error {
  /** HTTP status, or undefined for network/timeout failures. */
  readonly status?: number;
  /** DRF per-field validation errors: `{ field: ["message", ...] }`. */
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    options: { status?: number; fieldErrors?: Record<string, string[]>; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? {};
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface DrfErrorBody {
  detail?: string;
  non_field_errors?: string[];
  [field: string]: unknown;
}

function extractFieldErrors(body: DrfErrorBody): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(body)) {
    if (field === "detail") continue;
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      fieldErrors[field] = value;
    } else if (typeof value === "string") {
      fieldErrors[field] = [value];
    }
  }
  return fieldErrors;
}

/** Converts any thrown value from the HTTP layer into an {@link ApiError}. */
export async function normalizeApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof HTTPError) {
    const status = error.response.status;
    let body: DrfErrorBody | undefined;
    try {
      body = (await error.response.clone().json()) as DrfErrorBody;
    } catch {
      // Non-JSON error body — fall through to the generic message.
    }

    const fieldErrors = body ? extractFieldErrors(body) : {};
    const message =
      body?.detail ??
      body?.non_field_errors?.join(" ") ??
      `Request failed with status ${status}`;

    return new ApiError(message, { status, fieldErrors, cause: error });
  }

  if (error instanceof TimeoutError) {
    return new ApiError("The request timed out. Please try again.", { cause: error });
  }

  return new ApiError("A network error occurred. Please check your connection.", {
    cause: error,
  });
}

/**
 * Maps DRF field errors onto a React Hook Form instance so validation messages
 * from the backend appear next to the matching inputs.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ApiError,
): void {
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (field === "non_field_errors") continue;
    form.setError(field as Path<T>, { type: "server", message: messages.join(" ") });
  }
}
