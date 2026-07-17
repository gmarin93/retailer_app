import ky from "ky";
import { env } from "@/shared/lib/env";
import { useSessionStore } from "@/stores/session-store";
import { normalizeApiError } from "./errors";

/**
 * Central HTTP client. Faithfully reproduces the Angular `ApiInterceptor`:
 *
 * - `Accept: application/json` on every request
 * - `Authorization: Token <key>` when a session is active
 * - a 401 from our own API (except the login endpoint) expires the session
 *
 * All requests are made with absolute URLs (`env.apiHost` / `env.authUrl`)
 * because the backend exposes several API generations (v0/v1/v2) that feature
 * modules address explicitly.
 */

function isOwnApi(url: string): boolean {
  return url.startsWith(env.apiHost) || url.startsWith(env.authUrl);
}

function isLoginRequest(url: string): boolean {
  return url.includes("/rest-auth/login/") || url.endsWith("/login/");
}

/**
 * True when a 401 for this request means the stored token is invalid.
 * Ported verbatim from `ApiInterceptor._shouldLogoutOnUnauthorized`.
 */
function shouldLogoutOnUnauthorized(url: string): boolean {
  const { session } = useSessionStore.getState();
  if (!session) return false;
  if (isLoginRequest(url)) return false;
  return isOwnApi(url);
}

export const httpClient = ky.create({
  timeout: 30_000,
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("Accept", "application/json");
        const { session } = useSessionStore.getState();
        if (session && isOwnApi(request.url)) {
          request.headers.set("Authorization", `Token ${session.key}`);
        }
      },
    ],
    afterResponse: [
      (request, _options, response) => {
        if (response.status === 401 && shouldLogoutOnUnauthorized(request.url)) {
          useSessionStore.getState().expireSession();
        }
        return response;
      },
    ],
  },
});

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  /** Query params; null/undefined entries are dropped. */
  searchParams?: Record<string, QueryValue>;
  /** Abort signal — TanStack Query provides one per query for cancellation. */
  signal?: AbortSignal;
}

function cleanSearchParams(
  searchParams?: Record<string, QueryValue>,
): Record<string, string> | undefined {
  if (!searchParams) return undefined;
  const entries = Object.entries(searchParams)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Typed convenience wrappers that normalize every failure to {@link ApiError}. */
export const api = {
  async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await httpClient
        .get(url, {
          searchParams: cleanSearchParams(options.searchParams),
          signal: options.signal,
        })
        .json<T>();
    } catch (error) {
      throw await normalizeApiError(error);
    }
  },

  async post<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    try {
      return await httpClient.post(url, { json: body, signal: options.signal }).json<T>();
    } catch (error) {
      throw await normalizeApiError(error);
    }
  },

  async put<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    try {
      return await httpClient.put(url, { json: body, signal: options.signal }).json<T>();
    } catch (error) {
      throw await normalizeApiError(error);
    }
  },

  async patch<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    try {
      return await httpClient.patch(url, { json: body, signal: options.signal }).json<T>();
    } catch (error) {
      throw await normalizeApiError(error);
    }
  },

  async delete<T = void>(url: string, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await httpClient.delete(url, {
        searchParams: cleanSearchParams(options.searchParams),
        signal: options.signal,
      });
      if (response.status === 204) return undefined as T;
      return await response.json<T>();
    } catch (error) {
      throw await normalizeApiError(error);
    }
  },
};

/** Multipart POST for file uploads (auth/401 semantics identical to `api`). */
export async function apiPostForm<T>(
  url: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await httpClient
      .post(url, { body: formData, signal: options.signal, timeout: 120_000 })
      .json<T>();
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

/** Multipart PATCH (the v0 entity endpoints accept form-encoded patches). */
export async function apiPatchForm<T>(
  url: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await httpClient
      .patch(url, { body: formData, signal: options.signal, timeout: 120_000 })
      .json<T>();
  } catch (error) {
    throw await normalizeApiError(error);
  }
}
