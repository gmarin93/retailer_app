"use client";

import {
  AiMagicIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  Download01Icon,
  SecurityCheckIcon,
  SentIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { useAssistantChat } from "../hooks";
import { getQuickActions } from "../quick-actions";
import { ReportWizard } from "./report-wizard";

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="Thinking">
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400" />
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400 [animation-delay:0.2s]" />
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400 [animation-delay:0.4s]" />
    </span>
  );
}

function AssistantChatInner() {
  const chat = useAssistantChat();
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const quickActions = getQuickActions(pathname);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1000]">
      <button
        type="button"
        className="pointer-events-auto fixed right-5 bottom-5 z-[1001] flex size-14 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.4)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        aria-label={chat.open ? "Close Klikin AI" : "Ask Klikin AI"}
        title={chat.open ? "Close Klikin AI" : "Ask Klikin AI"}
        onClick={() => {
          if (chat.open) setReportOpen(false);
          chat.toggle();
        }}
      >
        <HugeiconsIcon
          icon={chat.open ? Cancel01Icon : AiMagicIcon}
          className="size-6"
        />
      </button>

      <aside
        aria-label="Klikin AI chat"
        className={cn(
          "pointer-events-auto fixed top-0 right-0 flex h-dvh w-[380px] max-w-[92vw] flex-col bg-[#0f172a] text-slate-200 shadow-[-8px_0_30px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out",
          chat.open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-400/20 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={AiMagicIcon} className="size-6 text-indigo-300" />
            <div>
              <p className="m-0 text-[15px] font-semibold text-slate-100">Klikin AI</p>
              <p className="m-0 text-xs text-slate-400">Your operations assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={!chat.canExport}
                  aria-label="Export report"
                  onClick={() => {
                    if (!chat.canExport) return;
                    setReportOpen(true);
                  }}
                  className="flex text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-35"
                >
                  <HugeiconsIcon icon={Share08Icon} className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Export a smart report of this conversation
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setReportOpen(false);
                chat.toggle();
              }}
              className="flex text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
            </button>
          </div>
        </header>

        {reportOpen ? (
          <ReportWizard history={chat.history} onClose={() => setReportOpen(false)} />
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {chat.messages.length === 0 ? (
                <div className="m-auto max-w-[240px] text-center text-slate-400">
                  <HugeiconsIcon
                    icon={AiMagicIcon}
                    className="mx-auto mb-2 size-10 text-indigo-500"
                  />
                  <p className="m-0 text-sm leading-relaxed">
                    Ask me about plans, jobs, itineraries, reminders or reports — or tap a
                    Quick Smart Action below.
                  </p>
                </div>
              ) : null}

              {chat.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-[14px] px-3 py-2.5 text-sm leading-snug",
                      message.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 text-slate-200",
                    )}
                  >
                    {message.pending ? (
                      <TypingDots />
                    ) : (
                      <>
                        <span className="whitespace-pre-wrap">{message.content}</span>

                        {message.attachments?.length ? (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {message.attachments.map((att) => (
                              <a
                                key={att.download_url}
                                href={att.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2 py-1.5 text-[13px] text-indigo-200 no-underline"
                              >
                                <HugeiconsIcon icon={Download01Icon} className="size-[18px]" />
                                <span className="truncate">{att.filename}</span>
                                {att.row_count != null ? (
                                  <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                    {att.row_count} rows
                                  </span>
                                ) : null}
                              </a>
                            ))}
                          </div>
                        ) : null}

                        {message.confirmations?.length ? (
                          <div className="mt-2 flex flex-col gap-2">
                            {message.confirmations.map((pc) => (
                              <div
                                key={pc.id}
                                className={cn(
                                  "rounded-[10px] border p-2.5",
                                  pc.status === "done"
                                    ? "border-green-500 bg-green-500/8"
                                    : "border-amber-500 bg-amber-500/8",
                                )}
                              >
                                <div className="flex items-start gap-2 text-[13px] text-slate-200">
                                  <HugeiconsIcon
                                    icon={SecurityCheckIcon}
                                    className="mt-0.5 size-[18px] shrink-0 text-amber-500"
                                  />
                                  <span>
                                    {pc.action.summary || "Confirm this action?"}
                                  </span>
                                </div>
                                {pc.status === "idle" ? (
                                  <div className="mt-2.5 flex gap-2">
                                    <button
                                      type="button"
                                      className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[13px] font-semibold text-slate-900 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                      onClick={() => void chat.confirm(message.id, pc.id)}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      className="flex-1 rounded-lg border border-slate-600 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                      onClick={() => chat.cancel(message.id, pc.id)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : null}
                                {pc.status === "running" ? (
                                  <p className="mt-2 mb-0 text-[13px] text-slate-400">Working…</p>
                                ) : null}
                                {pc.status === "cancelled" ? (
                                  <p className="mt-2 mb-0 text-[13px] text-slate-400">Cancelled.</p>
                                ) : null}
                                {pc.status === "done" || pc.status === "error" ? (
                                  <p
                                    className={cn(
                                      "mt-2 mb-0 text-[13px]",
                                      pc.status === "error" ? "text-red-400" : "text-slate-400",
                                    )}
                                  >
                                    {pc.resultText}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {chat.suggestions.length > 0 && !chat.sending ? (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {chat.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void chat.send(s)}
                      className="rounded-full border border-indigo-300/40 bg-transparent px-3 py-1.5 text-left text-xs text-indigo-200 transition-colors hover:bg-indigo-500/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}

              <div ref={chat.scrollAnchorRef} />
            </div>

            <div className="border-t border-slate-400/15 px-4 py-2.5">
              <p className="mb-2 text-[11px] tracking-wide text-slate-400 uppercase">
                Quick Smart Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.prompt}
                    type="button"
                    disabled={chat.sending}
                    onClick={() => void chat.send(action.prompt)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-left text-xs text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-50",
                      action.context
                        ? "border-violet-500/55 bg-indigo-500/12 hover:bg-indigo-500/24"
                        : "border-slate-400/25 bg-slate-800 hover:bg-slate-700",
                    )}
                  >
                    <HugeiconsIcon
                      icon={action.icon}
                      className="size-[18px] shrink-0 text-indigo-300"
                    />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form
              className="flex gap-2 border-t border-slate-400/20 px-4 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                const value = draft;
                setDraft("");
                void chat.send(value);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Klikin AI…"
                disabled={chat.sending}
                aria-label="Assistant message"
                autoComplete="off"
                className="flex-1 rounded-[10px] border border-slate-400/25 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-indigo-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={chat.sending || !draft.trim()}
                aria-label="Send message"
                className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-500 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-default disabled:opacity-50"
              >
                <HugeiconsIcon icon={SentIcon} className="size-4" />
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}

/** FAB + slide-over panel for Klikin AI (mounted only when assistantHost is set). */
export function AssistantChat() {
  return (
    <Suspense fallback={null}>
      <AssistantChatInner />
    </Suspense>
  );
}
