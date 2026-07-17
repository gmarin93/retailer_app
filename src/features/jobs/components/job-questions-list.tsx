"use client";

import { Delete02Icon, Edit02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { canWorkJob, isAssignedToJob } from "../permissions";
import { useAnswerJobQuestion, useDeleteJobAnswer, useEditJobAnswer } from "../hooks";
import type { DetailedJob, JobQuestionRequest, JobQuestionResponse } from "../schemas";
import { QuestionResponderDialog } from "./question-responder-dialog";

/** Renders an answer payload per question kind. */
function formatAnswer(answerData: unknown): string {
  if (answerData === true) return "Yes";
  if (answerData === false) return "No";
  if (Array.isArray(answerData)) return answerData.join(", ");
  if (answerData == null) return "";
  return String(answerData);
}

/**
 * Question requests with responses and add/edit/delete answer actions —
 * ported from `job-questions-list.component.ts`.
 */
export function JobQuestionsList({ job }: { job: DetailedJob }) {
  const session = useSession();
  const answerQuestion = useAnswerJobQuestion(job.id);
  const editAnswer = useEditJobAnswer(job.id);
  const deleteAnswer = useDeleteJobAnswer(job.id);

  const [responderTarget, setResponderTarget] = useState<{
    request: JobQuestionRequest;
    /** Present when editing an existing answer. */
    response?: JobQuestionResponse;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    request: JobQuestionRequest;
    response: JobQuestionResponse;
  } | null>(null);

  if (!session) return null;
  const mayWork = canWorkJob(job, session.user.role, session.user.id);
  // Answers by non-assignees are attributed to the first assignee (mobile parity).
  const answeredBy = !isAssignedToJob(job, session.user.id) ? job.assignees[0]?.id : undefined;

  if (job.question_requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions for this visit.</p>;
  }

  return (
    <ul className="space-y-3">
      {job.question_requests.map((request) => {
        const responses = request.job_responses;
        const isAnswering =
          answerQuestion.isPending && responderTarget?.request.id === request.id;
        return (
          <li key={request.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {request.description}
                {request.required && <span className="ml-1 text-destructive">*</span>}
              </p>
              {mayWork && responses.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isAnswering}
                  onClick={() => setResponderTarget({ request })}
                >
                  <HugeiconsIcon
                    icon={PencilEdit01Icon}
                    aria-hidden="true"
                    className="size-4"
                  />
                  {isAnswering ? "Saving…" : "Answer"}
                </Button>
              )}
            </div>

            {responses.length === 0 ? (
              <p className="mt-1 text-muted-foreground">No answer yet.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {responses.map((response) => (
                  <li key={response.id} className="flex items-center justify-between gap-2">
                    <span>{formatAnswer(response.answer_data)}</span>
                    {mayWork && (
                      <span className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit answer"
                          disabled={editAnswer.isPending}
                          onClick={() => setResponderTarget({ request, response })}
                          className="size-7"
                        >
                          <HugeiconsIcon
                            icon={Edit02Icon}
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete answer"
                          disabled={deleteAnswer.isPending}
                          onClick={() => setDeleteTarget({ request, response })}
                          className="size-7"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            aria-hidden="true"
                            className="size-3.5 text-destructive"
                          />
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}

      {responderTarget && (
        <QuestionResponderDialog
          // Remount per target so initial answer state resets.
          key={`${responderTarget.request.id}-${responderTarget.response?.id ?? "new"}`}
          request={responderTarget.request}
          initialAnswer={responderTarget.response?.answer_data}
          open
          onOpenChange={(open) => !open && setResponderTarget(null)}
          onSubmit={(answerData) => {
            if (responderTarget.response) {
              editAnswer.mutate({
                questionResponseId: responderTarget.response.id,
                answerData,
              });
            } else {
              answerQuestion.mutate({
                questionRequestId: responderTarget.request.id,
                answerData,
                answeredBy,
              });
            }
          }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete answer"
        question="Are you sure you want to delete this answer?"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            deleteAnswer.mutate({
              questionRequestId: deleteTarget.request.id,
              questionResponseId: deleteTarget.response.id,
            });
          }
        }}
      />
    </ul>
  );
}
