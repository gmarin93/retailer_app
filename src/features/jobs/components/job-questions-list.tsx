"use client";

import {
  Alert02Icon,
  Delete02Icon,
  Edit02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/hooks";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";
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

function SoftButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f0fe] px-3 py-1.5 text-[13px] font-medium text-[#4a76fd] transition-colors hover:bg-[#dce8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a76fd]/35 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-[#e8f0fe]"
    >
      {children}
    </button>
  );
}

/**
 * Question requests with responses and add/edit/delete answer actions —
 * visual twin of Angular `job-questions-list` (3-column card grid).
 */
export function JobQuestionsList({
  job,
  showCardBadge = false,
  singleColumn = false,
}: {
  job: DetailedJob;
  /** Review page: blue Answer badge in each card header. */
  showCardBadge?: boolean;
  /** Force a single column (narrow panels). */
  singleColumn?: boolean;
}) {
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
    <>
      <div
        className={cn(
          "grid gap-4 py-1",
          singleColumn
            ? "grid-cols-1"
            : "grid-cols-1 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3",
        )}
      >
        {job.question_requests.map((request) => {
          const responses = request.job_responses;
          const isAnswering =
            answerQuestion.isPending && responderTarget?.request.id === request.id;
          const hasResponse = responses.length > 0;

          return (
            <div
              key={request.id}
              className="box-border min-w-0 rounded-xl border border-black/10 bg-white p-4 dark:border-border dark:bg-card"
            >
              <div className="flex flex-row items-center gap-3">
                {showCardBadge ? (
                  <div className="inline-flex size-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-[#4a76fd] text-white">
                    <HugeiconsIcon icon={HelpCircleIcon} className="size-[22px]" aria-hidden="true" />
                    <span className="text-[10px] font-bold tracking-wide uppercase">Answer</span>
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-row flex-wrap items-start gap-2">
                  {request.required && mayWork ? (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      className="mt-0.5 size-[22px] shrink-0 text-[#e65100]"
                      aria-label="Required"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                    {request.description}
                    {request.required && !mayWork ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div className="my-3 h-px bg-black/10 dark:bg-border" aria-hidden="true" />

              {!hasResponse ? (
                <div className="flex flex-col items-start gap-3 pb-0.5">
                  <span className="text-sm text-muted-foreground">No answer</span>
                  {mayWork ? (
                    <SoftButton
                      disabled={isAnswering}
                      onClick={() => setResponderTarget({ request })}
                    >
                      {isAnswering ? "Saving…" : "Write an answer"}
                    </SoftButton>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-stretch gap-3">
                  {responses.map((response) => {
                    const busy =
                      (editAnswer.isPending &&
                        responderTarget?.response?.id === response.id) ||
                      (deleteAnswer.isPending && deleteTarget?.response.id === response.id);
                    return (
                      <div
                        key={response.id}
                        className={cn(
                          "flex min-w-0 flex-col items-stretch",
                          busy && "opacity-50",
                        )}
                      >
                        <div className="relative pb-1">
                          <p className="text-sm text-foreground">
                            {formatAnswer(response.answer_data) || (
                              <span className="text-muted-foreground">No answer</span>
                            )}
                          </p>
                        </div>
                        {mayWork ? (
                          <div className="mt-4 flex flex-row flex-wrap items-center justify-start gap-2 pt-1">
                            <SoftButton
                              disabled={busy}
                              ariaLabel="Edit answer"
                              onClick={() => setResponderTarget({ request, response })}
                            >
                              <HugeiconsIcon icon={Edit02Icon} size={18} strokeWidth={1.8} />
                              <span>Edit</span>
                            </SoftButton>
                            <SoftButton
                              disabled={busy}
                              ariaLabel="Remove answer"
                              onClick={() => setDeleteTarget({ request, response })}
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
                              <span>Remove</span>
                            </SoftButton>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
              editAnswer.mutate(
                {
                  questionResponseId: responderTarget.response.id,
                  answerData,
                },
                { onSuccess: () => setResponderTarget(null) },
              );
            } else {
              answerQuestion.mutate(
                {
                  questionRequestId: responderTarget.request.id,
                  answerData,
                  answeredBy,
                },
                { onSuccess: () => setResponderTarget(null) },
              );
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
    </>
  );
}
