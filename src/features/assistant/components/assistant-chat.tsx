"use client";

import { Cancel01Icon, ChatIcon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { useAssistantChat } from "../hooks";

const QUICK_PROMPTS = [
  "What needs my attention today?",
  "Summarize pending reviews",
  "Help me find overdue visits",
];

function AssistantChatInner() {
  const chat = useAssistantChat();
  const [draft, setDraft] = useState("");

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-lg"
        aria-label="Open AI assistant"
        onClick={() => chat.setOpen(true)}
      >
        <HugeiconsIcon icon={ChatIcon} className="size-5" />
      </Button>

      <Sheet open={chat.open} onOpenChange={chat.setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Klikin Assistant</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
            {chat.messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ask about visits, reviews, or what needs attention.
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void chat.send(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {chat.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.attachments?.map((file) => (
                  <a
                    key={file.download_url}
                    href={file.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs underline"
                  >
                    {file.filename}
                  </a>
                ))}

                {message.confirmations?.map((action, index) => (
                  <div
                    key={`${message.id}-confirm-${index}`}
                    className="mt-2 space-y-2 rounded-md border bg-background p-2 text-foreground"
                  >
                    <p className="text-xs">
                      {action.summary || `Confirm ${action.operation ?? "action"}?`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void chat.confirm(action)}
                      >
                        Confirm
                      </Button>
                      <Button type="button" size="sm" variant="ghost">
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}

                {message.suggested?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.suggested.map((chip) => (
                      <Button
                        key={chip}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-auto whitespace-normal px-2 py-1 text-xs"
                        onClick={() => void chat.send(chip)}
                      >
                        {chip}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {chat.sending && (
              <p className="text-xs text-muted-foreground">Thinking…</p>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const value = draft;
              setDraft("");
              void chat.send(value);
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask Klikin…"
              disabled={chat.sending}
              aria-label="Assistant message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={chat.sending || !draft.trim()}
              aria-label="Send"
            >
              <HugeiconsIcon icon={SentIcon} className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** FAB + drawer for the Klikin assistant (mounted only when assistantHost is set). */
export function AssistantChat() {
  return (
    <Suspense fallback={null}>
      <AssistantChatInner />
    </Suspense>
  );
}
