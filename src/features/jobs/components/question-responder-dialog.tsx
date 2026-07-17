"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";
import type { JobQuestionRequest } from "../schemas";

/** Question definition payload (`question_request.data` per kind). */
interface QuestionData {
  items?: string[];
  choices?: string[];
  min?: number;
  max?: number;
}

/**
 * Kind-aware answer dialog (text / yes-no / checklist / multiple choice /
 * number) — ported from `question-responder-dialog.component.ts`. `answer_data`
 * shapes match the Angular controls: string, boolean, string[], string, number.
 */
export function QuestionResponderDialog({
  request,
  initialAnswer,
  open,
  onOpenChange,
  onSubmit,
}: {
  request: JobQuestionRequest;
  initialAnswer?: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (answerData: unknown) => void;
}) {
  const data = (request as { data?: QuestionData }).data ?? {};
  const [answer, setAnswer] = useState<unknown>(initialAnswer ?? null);

  const checklist = Array.isArray(answer) ? (answer as string[]) : [];
  const toggleChecklistItem = (item: string) => {
    setAnswer(
      checklist.includes(item)
        ? checklist.filter((entry) => entry !== item)
        : [...checklist, item],
    );
  };

  const hasAnswer =
    answer !== null &&
    answer !== undefined &&
    answer !== "" &&
    (!Array.isArray(answer) || answer.length > 0);

  const radioRow = (label: string, selected: boolean, onSelect: () => void) => (
    <button
      key={label}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
        selected ? "border-primary bg-primary/5 font-medium" : "hover:bg-accent",
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Answer question</DialogTitle>
          <DialogDescription>{request.description}</DialogDescription>
        </DialogHeader>

        {request.kind === "text" && (
          <div className="space-y-1.5">
            <Label htmlFor="answer-text">Answer</Label>
            <textarea
              id="answer-text"
              value={typeof answer === "string" ? answer : ""}
              onChange={(event) => setAnswer(event.target.value)}
              rows={4}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {request.kind === "true_false" && (
          <div role="radiogroup" aria-label="Answer" className="space-y-2">
            {radioRow("Yes", answer === true, () => setAnswer(true))}
            {radioRow("No", answer === false, () => setAnswer(false))}
          </div>
        )}

        {request.kind === "checklist" && (
          <div className="space-y-2">
            {(data.items ?? []).map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.includes(item)}
                  onChange={() => toggleChecklistItem(item)}
                  className="size-4"
                />
                {item}
              </label>
            ))}
          </div>
        )}

        {request.kind === "multiple_choice" && (
          <div role="radiogroup" aria-label="Answer" className="space-y-2">
            {(data.choices ?? []).map((choice) =>
              radioRow(choice, answer === choice, () => setAnswer(choice)),
            )}
          </div>
        )}

        {request.kind === "number" && (
          <div className="space-y-1.5">
            <Label htmlFor="answer-number">
              Answer
              {data.min != null || data.max != null
                ? ` (${data.min ?? "…"} – ${data.max ?? "…"})`
                : ""}
            </Label>
            <Input
              id="answer-number"
              type="number"
              min={data.min}
              max={data.max}
              value={typeof answer === "number" ? answer : ""}
              onChange={(event) =>
                setAnswer(event.target.value === "" ? null : Number(event.target.value))
              }
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!hasAnswer}
            onClick={() => {
              onSubmit(answer);
              onOpenChange(false);
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
