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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e8f0fe] px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-[#4a76fd] transition-colors hover:bg-[#dce8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a76fd]/35 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-[#e8f0fe] dark:bg-primary/15 dark:text-primary dark:hover:bg-primary/25"
    >
      {children}
    </button>
  );
}

/**
 * Question requests with responses and add/edit/delete answer actions —
 * visual twin of Angular `job-questions-list`.
 */
export function JobQuestionsList({
  job,
  showCardBadge = false,
  singleColumn = false,
}: {
  job: DetailedJob;
  /** Review page: blue Answer badge in each card header. */
  showCardBadge?: boolean;
  /** Force a single column (narrow panels / review detail). */
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
  // Non-assignees pick which assignee to answer on behalf of in the dialog.
  const notAssigned = !isAssignedToJob(job, session.user.id);

  const responderPending =
    (responderTarget?.response
      ? editAnswer.isPending
      : answerQuestion.isPending) && responderTarget !== null;

  if (job.question_requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions for this visit.</p>;
  }

  // Review / narrow panels: stack like photos. Wider surfaces keep the card grid.
  const useListLayout = singleColumn || showCardBadge;

  return (
    <>
      <ul
        className={cn(
          useListLayout
            ? "space-y-3"
            : "grid grid-cols-1 gap-4 py-1 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3",
        )}
      >
        {job.question_requests.map((request) => {
          const responses = request.job_responses;
          const isAnswering =
            answerQuestion.isPending && responderTarget?.request.id === request.id;
          const hasResponse = responses.length > 0;

          return (
            <li
              key={request.id}
              className={cn(
                "box-border min-w-0 text-sm",
                showCardBadge
                  ? "rounded-xl border border-border bg-card p-3 shadow-sm"
                  : "rounded-xl border border-black/10 bg-white p-4 dark:border-border dark:bg-card",
              )}
            >
              <div className="flex items-start gap-3">
                {showCardBadge ? (
                  <div className="inline-flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
                    <HugeiconsIcon
                      icon={HelpCircleIcon}
                      className="size-4"
                      aria-hidden="true"
                    />
                    Answer
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start gap-2">
                    {request.required && mayWork ? (
                      <HugeiconsIcon
                        icon={Alert02Icon}
                        className="mt-0.5 size-4 shrink-0 text-amber-500"
                        aria-label="Required"
                      />
                    ) : null}
                    <p className="min-w-0 flex-1 font-medium leading-snug text-foreground">
                      {request.description}
                      {request.required && !mayWork ? (
                        <span className="ml-1 text-destructive">*</span>
                      ) : null}
                    </p>
                  </div>

                  {!showCardBadge ? (
                    <div className="h-px bg-black/10 dark:bg-border" aria-hidden="true" />
                  ) : null}

                  {!hasResponse ? (
                    <div
                      className={cn(
                        "flex gap-3",
                        showCardBadge
                          ? "flex-col items-stretch sm:flex-row sm:items-center sm:justify-between"
                          : "flex-col items-start",
                      )}
                    >
                      <span className="text-muted-foreground">No answer</span>
                      {mayWork ? (
                        <div className={cn(showCardBadge && "flex justify-end")}>
                          <SoftButton
                            disabled={isAnswering}
                            onClick={() => setResponderTarget({ request })}
                          >
                            {isAnswering ? "Saving…" : "Write an answer"}
                          </SoftButton>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {responses.map((response) => {
                        const isEditing =
                          editAnswer.isPending &&
                          responderTarget?.response?.id === response.id;
                        const isDeleting =
                          deleteAnswer.isPending &&
                          deleteTarget?.response.id === response.id;
                        const busy = isEditing || isDeleting;
                        return (
                          <div
                            key={response.id}
                            className={cn(
                              "flex min-w-0 flex-col gap-3",
                              showCardBadge &&
                                "sm:flex-row sm:items-end sm:justify-between",
                              busy && "opacity-50",
                            )}
                          >
                            <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                              {formatAnswer(response.answer_data) || (
                                <span className="text-muted-foreground">No answer</span>
                              )}
                            </p>
                            {mayWork ? (
                              <div className="flex flex-row flex-wrap items-center gap-2">
                                <SoftButton
                                  disabled={busy}
                                  ariaLabel="Edit answer"
                                  onClick={() =>
                                    setResponderTarget({ request, response })
                                  }
                                >
                                  <HugeiconsIcon
                                    icon={Edit02Icon}
                                    size={18}
                                    strokeWidth={1.8}
                                  />
                                  <span>{isEditing ? "Saving…" : "Edit"}</span>
                                </SoftButton>
                                <SoftButton
                                  disabled={busy}
                                  ariaLabel="Remove answer"
                                  onClick={() => setDeleteTarget({ request, response })}
                                >
                                  <HugeiconsIcon
                                    icon={Delete02Icon}
                                    size={18}
                                    strokeWidth={1.8}
                                  />
                                  <span>{isDeleting ? "Removing…" : "Remove"}</span>
                                </SoftButton>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {responderTarget && (
        <QuestionResponderDialog
          // Remount per target so initial answer state resets.
          key={`${responderTarget.request.id}-${responderTarget.response?.id ?? "new"}`}
          request={responderTarget.request}
          initialAnswer={responderTarget.response?.answer_data}
          open
          isPending={responderPending}
          onOpenChange={(open) => !open && setResponderTarget(null)}
          // Edits keep the original attribution; only new answers pick a user.
          assignees={!responderTarget.response && notAssigned ? job.assignees : undefined}
          onSubmit={(answerData, answeredBy) => {
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
        isPending={deleteAnswer.isPending}
        confirmLabel={deleteAnswer.isPending ? "Deleting…" : "Yes"}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteAnswer.mutate(
            {
              questionRequestId: deleteTarget.request.id,
              questionResponseId: deleteTarget.response.id,
            },
            { onSuccess: () => setDeleteTarget(null) },
          );
        }}
      />
    </>
  );
}
