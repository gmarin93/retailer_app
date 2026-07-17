"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import { postAssistantChat, postAssistantConfirm } from "./api";
import type { ChatMessage, KlikinAction } from "./schemas";

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyActions(actions: KlikinAction[], router: ReturnType<typeof useRouter>) {
  for (const action of actions) {
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
  const [sending, setSending] = useState(false);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

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

      const confirmations = response.actions.filter((a) => a.type === "confirm_action");
      const navigations = response.actions.filter((a) => a.type !== "confirm_action");
      applyActions(navigations, router);

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: response.reply,
          attachments: response.attachments,
          confirmations,
          suggested: response.suggested,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 401
            ? "Assistant session expired. Please sign in again."
            : error.message
          : "Assistant request failed";
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: "Sorry — I couldn't complete that request.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const confirm = async (action: KlikinAction) => {
    if (!action.operation) return;
    try {
      const result = await postAssistantConfirm(action.operation, action.params ?? {});
      if (result.ok) {
        toast.success(result.summary || "Action confirmed");
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: result.summary || "Done.",
          },
        ]);
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    }
  };

  return {
    open,
    setOpen,
    messages,
    sending,
    send,
    confirm,
  };
}
