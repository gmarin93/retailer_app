"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/shared/services/api";
import { postAssistantChat, postAssistantConfirm } from "./api";
import type {
  ChatMessage,
  KlikinAction,
  PendingConfirmation,
} from "./schemas";

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function highlightElement(target: string) {
  window.setTimeout(() => {
    const el = document.getElementById(target);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("klikin-highlight");
    window.setTimeout(() => el.classList.remove("klikin-highlight"), 2200);
  }, 50);
}

function applyImmediateActions(
  actions: KlikinAction[],
  router: ReturnType<typeof useRouter>,
  pathname: string,
) {
  for (const action of actions) {
    if (action.type === "operate_page" && action.route) {
      const route = action.route.split("?")[0];
      const filters = action.filters ?? {};
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value != null) params.set(key, String(value));
      }
      const qs = params.toString();
      const current = (pathname || "/").split("?")[0];
      if (current !== route) {
        router.push(qs ? `${route}?${qs}` : route);
      } else if (qs) {
        router.push(`${route}?${qs}`);
      }
      continue;
    }
    if (action.type === "navigate" && action.route) {
      const params = new URLSearchParams();
      if (action.filters) {
        for (const [key, value] of Object.entries(action.filters)) {
          if (value != null) params.set(key, String(value));
        }
      }
      const qs = params.toString();
      router.push(qs ? `${action.route}?${qs}` : action.route);
    }
    if (action.type === "set_filter" && action.key != null) {
      const url = new URL(window.location.href);
      if (action.value == null || action.value === "") {
        url.searchParams.delete(action.key);
      } else {
        url.searchParams.set(action.key, String(action.value));
      }
      router.push(`${url.pathname}${url.search}`);
    }
    if (action.type === "highlight" && action.target) {
      highlightElement(action.target);
    }
  }
}

export function useAssistantChat() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
    const pendingId = nextId();
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setSuggestions([]);
    setSending(true);
    scrollToBottom();

    try {
      const filters: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        filters[key] = value;
      });
      const response = await postAssistantChat({
        message: trimmed,
        sessionId,
        history,
        uiState: { route: pathname, filters },
      });

      setSessionId(response.session_id);
      setHistory(response.history);
      setSuggestions(response.suggested ?? []);

      const confirmations: PendingConfirmation[] = response.actions
        .filter((a) => a.type === "confirm_action" && a.operation)
        .map((action) => ({ id: nextId(), action, status: "idle" as const }));
      const navigations = response.actions.filter((a) => a.type !== "confirm_action");
      applyImmediateActions(navigations, router, pathname);

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                content: response.reply || "(no response)",
                attachments: response.attachments,
                confirmations,
                pending: false,
              }
            : message,
        ),
      );
    } catch (error) {
      const content =
        error instanceof ApiError && error.status === 401
          ? "Your session expired — please log in again."
          : "Sorry, something went wrong reaching Klikin AI.";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? { ...message, content, pending: false }
            : message,
        ),
      );
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const confirm = async (messageId: string, confirmationId: string) => {
    let operation: string | undefined;
    let params: Record<string, unknown> = {};

    setMessages((prev) => {
      const target = prev
        .find((m) => m.id === messageId)
        ?.confirmations?.find((c) => c.id === confirmationId);
      if (!target || target.status !== "idle" || !target.action.operation) return prev;
      operation = target.action.operation;
      params = target.action.params ?? {};
      return prev.map((message) => {
        if (message.id !== messageId || !message.confirmations) return message;
        return {
          ...message,
          confirmations: message.confirmations.map((pc) =>
            pc.id === confirmationId ? { ...pc, status: "running" } : pc,
          ),
        };
      });
    });

    if (!operation) return;

    try {
      const result = await postAssistantConfirm(operation, params);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.confirmations) return m;
          return {
            ...m,
            confirmations: m.confirmations.map((c) =>
              c.id === confirmationId
                ? {
                    ...c,
                    status: result.ok ? "done" : "error",
                    resultText: result.ok
                      ? result.summary
                        ? `Done — ${result.summary}`
                        : "Done."
                      : result.error || "The action could not be completed.",
                  }
                : c,
            ),
          };
        }),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.confirmations) return m;
          return {
            ...m,
            confirmations: m.confirmations.map((c) =>
              c.id === confirmationId
                ? {
                    ...c,
                    status: "error",
                    resultText:
                      error instanceof ApiError && error.status === 401
                        ? "Your session expired — please log in again."
                        : "The action could not be completed.",
                  }
                : c,
            ),
          };
        }),
      );
    }
    scrollToBottom();
  };

  const cancel = (messageId: string, confirmationId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.confirmations) return message;
        return {
          ...message,
          confirmations: message.confirmations.map((pc) =>
            pc.id === confirmationId && pc.status === "idle"
              ? { ...pc, status: "cancelled" }
              : pc,
          ),
        };
      }),
    );
  };

  return {
    open,
    setOpen,
    toggle: () => setOpen((v) => !v),
    messages,
    sending,
    suggestions,
    history,
    canExport: history.length > 0,
    scrollAnchorRef,
    send,
    confirm,
    cancel,
  };
}
