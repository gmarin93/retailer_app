"use client";

import { KeyboardIcon, RefreshIcon, CheckListIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import {
  fetchJob,
  fetchJobs,
  patchReviewableJobStatus,
  setPhotoResponseFeedback,
  setPhotoResponseStatus,
} from "@/features/jobs/api";
import { resultsPageSchema, fetchAllPages } from "@/shared/services/api/pagination";
import { listableJobSchema } from "@/features/jobs/schemas";
import type {
  DetailedJob,
  JobPhotoRequest,
  JobPhotoResponse,
  JobQuestionRequest,
  JobQuestionResponse,
  ListableJob,
} from "@/features/jobs/schemas";

// ── Types ──────────────────────────────────────────────────────────────────

interface PhotoItem {
  photoRequest: JobPhotoRequest;
  photoResponse: JobPhotoResponse;
}

interface QuestionItem {
  questionRequest: JobQuestionRequest;
  questionResponse: JobQuestionResponse | null;
}

type SpeedReviewPanel = "photos" | "questions";

// ── Queue loader ───────────────────────────────────────────────────────────

async function loadAllPendingReviewable(
  cycles: number[],
  customers: number[],
  signal?: AbortSignal,
): Promise<ListableJob[]> {
  const pageSchema = resultsPageSchema(listableJobSchema);
  const all = await fetchAllPages((page) =>
    fetchJobs(
      {
        view: "reviewable",
        page: page - 1, // fetchJobs is 0-based internally
        pageSize: 200,
        order: [],
        statuses: ["pending"],
        cycles: cycles.length ? cycles : undefined,
        customers: customers.length ? customers : undefined,
      },
      signal,
    ).then((r) => pageSchema.parse(r)),
  );
  return all.sort((a, b) => {
    const aT = a.visit?.closes_at ? new Date(a.visit.closes_at).getTime() : 0;
    const bT = b.visit?.closes_at ? new Date(b.visit.closes_at).getTime() : 0;
    return aT !== bT ? aT - bT : a.id - b.id;
  });
}

// ── Keyboard shortcut legend (Angular header legend bar) ───────────────────

const SHORTCUTS: { key: string; desc: string }[] = [
  { key: "1", desc: "Photos tab" },
  { key: "2", desc: "Questions tab" },
  { key: "A", desc: "Accept photo" },
  { key: "R", desc: "Reject photo" },
  { key: "F", desc: "Feedback" },
  { key: "N / →", desc: "Next item" },
  { key: "P / ←", desc: "Previous item" },
  { key: "J / ↓", desc: "Next visit" },
  { key: "K / ↑", desc: "Previous visit" },
  { key: "M", desc: "Mark visit reviewed" },
  { key: "S", desc: "Skip visit" },
  { key: "?", desc: "Toggle shortcuts" },
];

/** Inline shortcut legend bar under the header (Angular `__shortcuts` section). */
function ShortcutLegend() {
  return (
    <section
      aria-label="Keyboard shortcuts"
      className="flex flex-wrap gap-x-4 gap-y-1.5 border-b bg-card px-4 py-2"
    >
      {SHORTCUTS.map(({ key, desc }) => (
        <span key={key} className="inline-flex items-center gap-1.5 text-xs">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            {key}
          </kbd>
          <span className="text-muted-foreground">{desc}</span>
        </span>
      ))}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SpeedReviewView() {
  const searchParams = useSearchParams();

  const [visitQueue, setVisitQueue] = useState<ListableJob[]>([]);
  const [visitIndex, setVisitIndex] = useState(0);
  const [currentJob, setCurrentJob] = useState<DetailedJob | null>(null);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [questionItems, setQuestionItems] = useState<QuestionItem[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [activePanel, setActivePanel] = useState<SpeedReviewPanel>("photos");
  const [queueLoading, setQueueLoading] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueCustomerId, setQueueCustomerId] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");

  // Derived: filtered queue
  const filteredQueue = visitQueue.filter((v) => {
    if (queueCustomerId != null && v.customer?.id !== queueCustomerId) return false;
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      const haystack = [
        String(v.id),
        v.customer?.title,
        v.store?.title,
        v.store?.store_no,
        v.program?.title,
        v.cycle?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const queueCustomers = Array.from(
    visitQueue
      .reduce<Map<number, { id: number; title: string; count: number }>>((m, v) => {
        if (v.customer?.id) {
          const existing = m.get(v.customer.id);
          if (existing) existing.count++;
          else m.set(v.customer.id, { id: v.customer.id, title: v.customer.title, count: 1 });
        }
        return m;
      }, new Map())
      .values(),
  ).sort((a, b) => a.title.localeCompare(b.title));

  const currentPhotoItem = photoItems[photoIndex] ?? null;
  const currentQuestionItem = questionItems[questionIndex] ?? null;
  const pendingPhotosCount = photoItems.filter(
    (p) => p.photoResponse.status === "pending",
  ).length;

  // ── Queue loading ────────────────────────────────────────────────────────

  const loadVisitAt = useCallback(
    async (index: number, queue: ListableJob[], signal?: AbortSignal) => {
      if (index < 0 || index >= queue.length) return;
      const target = queue[index];
      if (!target) return;
      setVisitIndex(index);
      setVisitLoading(true);
      setCurrentJob(null);
      setPhotoItems([]);
      setQuestionItems([]);
      try {
        const job = await fetchJob(target.id, signal, "reviewable");
        setCurrentJob(job);

        const photos: PhotoItem[] = [];
        for (const pr of job.photo_requests ?? []) {
          for (const resp of pr.job_responses ?? []) {
            photos.push({ photoRequest: pr, photoResponse: { ...resp } });
          }
        }
        const firstPending = photos.findIndex((p) => p.photoResponse.status === "pending");
        setPhotoItems(photos);
        setPhotoIndex(firstPending >= 0 ? firstPending : 0);

        const questions: QuestionItem[] = (job.question_requests ?? []).map((qr) => ({
          questionRequest: qr,
          questionResponse: qr.job_responses?.[0] ?? null,
        }));
        setQuestionItems(questions);
        setQuestionIndex(0);

        if (photos.length > 0) setActivePanel("photos");
        else if (questions.length > 0) setActivePanel("questions");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        toast.error("Failed to load visit.");
      } finally {
        setVisitLoading(false);
      }
    },
    [],
  );

  const loadQueue = useCallback(
    async (signal?: AbortSignal) => {
      setQueueLoading(true);
      setQueueError(null);
      setVisitQueue([]);
      setCurrentJob(null);
      setPhotoItems([]);
      setQuestionItems([]);

      const cycleParts = (searchParams.get("cycle") ?? "")
        .split(",")
        .map(Number)
        .filter(Boolean);
      const customerParts = (searchParams.get("customer") ?? "")
        .split(",")
        .map(Number)
        .filter(Boolean);

      try {
        const jobs = await loadAllPendingReviewable(cycleParts, customerParts, signal);
        setQueueCustomerId(null);
        setQueueSearch("");
        setVisitQueue(jobs);
        setVisitIndex(0);
        if (jobs.length > 0) {
          await loadVisitAt(0, jobs, signal);
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setQueueError("Could not load the review queue. Try again.");
      } finally {
        setQueueLoading(false);
      }
    },
    [searchParams, loadVisitAt],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Mount/filter-driven queue refresh (AbortSignal cancels on teardown).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async bootstrap
    void loadQueue(controller.signal);
    return () => controller.abort();
  }, [loadQueue]);

  // ── Photo actions ────────────────────────────────────────────────────────

  const setPhotoStatus = async (
    status: "accepted" | "rejected" | "pending",
    successMsg: string,
  ) => {
    if (!currentPhotoItem || actionPending) return;
    const { photoResponse } = currentPhotoItem;
    const previous = photoResponse.status;
    // Optimistic update
    setPhotoItems((prev) =>
      prev.map((item, i) =>
        i === photoIndex ? { ...item, photoResponse: { ...item.photoResponse, status } } : item,
      ),
    );
    setActionPending(true);
    try {
      await setPhotoResponseStatus(photoResponse.id, status);
      toast.success(successMsg);
      if (status !== "pending") advanceAfterPhotoAction();
    } catch {
      // Revert
      setPhotoItems((prev) =>
        prev.map((item, i) =>
          i === photoIndex
            ? { ...item, photoResponse: { ...item.photoResponse, status: previous } }
            : item,
        ),
      );
      toast.error("Failed to update photo status.");
    } finally {
      setActionPending(false);
    }
  };

  const acceptPhoto = () => {
    const current = photoItems[photoIndex];
    if (!current) return;
    const next = current.photoResponse.status === "accepted" ? "pending" : "accepted";
    void setPhotoStatus(next, next === "accepted" ? "Photo accepted." : "Photo un-accepted.");
  };

  const rejectPhoto = () => {
    const current = photoItems[photoIndex];
    if (!current) return;
    const next = current.photoResponse.status === "rejected" ? "pending" : "rejected";
    void setPhotoStatus(next, next === "rejected" ? "Photo rejected." : "Photo un-rejected.");
  };

  const openFeedback = () => {
    if (!currentPhotoItem) return;
    setFeedbackDraft(currentPhotoItem.photoResponse.feedback ?? "");
    setFeedbackOpen(true);
  };

  const saveFeedback = async () => {
    if (!currentPhotoItem) return;
    const id = currentPhotoItem.photoResponse.id;
    try {
      await setPhotoResponseFeedback(id, feedbackDraft);
      setPhotoItems((prev) =>
        prev.map((item, i) =>
          i === photoIndex
            ? { ...item, photoResponse: { ...item.photoResponse, feedback: feedbackDraft } }
            : item,
        ),
      );
      toast.success("Feedback saved.");
    } catch {
      toast.error("Failed to save feedback.");
    }
    setFeedbackOpen(false);
  };

  const advanceAfterPhotoAction = () => {
    setPhotoItems((prev) => {
      const nextPending = prev.findIndex(
        (p, i) => i > photoIndex && p.photoResponse.status === "pending",
      );
      if (nextPending >= 0) {
        setPhotoIndex(nextPending);
        return prev;
      }
      const anyPending = prev.findIndex((p) => p.photoResponse.status === "pending");
      if (anyPending >= 0) {
        setPhotoIndex(anyPending);
        return prev;
      }
      if (photoIndex < prev.length - 1) setPhotoIndex((idx) => idx + 1);
      return prev;
    });
  };

  // ── Visit actions ────────────────────────────────────────────────────────

  const markReviewed = async () => {
    if (!currentJob || actionPending) return;
    if (pendingPhotosCount > 0) {
      toast.error("Rate all photos before marking the visit reviewed.");
      return;
    }
    setActionPending(true);
    try {
      await patchReviewableJobStatus(currentJob.id, "completed");
      toast.success("Visit marked as reviewed.");
      const newQueue = visitQueue.filter((_, i) => i !== visitIndex);
      setVisitQueue(newQueue);
      if (newQueue.length === 0) {
        setCurrentJob(null);
        setPhotoItems([]);
      } else {
        const nextIdx = Math.min(visitIndex, newQueue.length - 1);
        await loadVisitAt(nextIdx, newQueue);
      }
    } catch {
      toast.error("Failed to mark visit as reviewed.");
    } finally {
      setActionPending(false);
    }
  };

  const skipVisit = () => {
    if (visitIndex < visitQueue.length - 1) void loadVisitAt(visitIndex + 1, visitQueue);
    else if (visitIndex > 0) void loadVisitAt(0, visitQueue);
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;

      const key = e.key.toLowerCase();

      if (key === "?" || e.key === "?") {
        e.preventDefault();
        setShowShortcutHelp((v) => !v);
        return;
      }
      if (key === "escape") {
        setShowShortcutHelp(false);
        return;
      }
      if (visitLoading || queueLoading || actionPending) return;

      switch (key) {
        case "1":
          e.preventDefault();
          setActivePanel("photos");
          break;
        case "2":
          e.preventDefault();
          setActivePanel("questions");
          break;
        case "a":
          if (activePanel !== "photos") break;
          e.preventDefault();
          acceptPhoto();
          break;
        case "r":
          if (activePanel !== "photos") break;
          e.preventDefault();
          rejectPhoto();
          break;
        case "f":
          if (activePanel !== "photos") break;
          e.preventDefault();
          openFeedback();
          break;
        case "n":
        case "arrowright":
          e.preventDefault();
          if (activePanel === "photos")
            setPhotoIndex((i) => Math.min(i + 1, photoItems.length - 1));
          else setQuestionIndex((i) => Math.min(i + 1, questionItems.length - 1));
          break;
        case "p":
        case "arrowleft":
          e.preventDefault();
          if (activePanel === "photos") setPhotoIndex((i) => Math.max(i - 1, 0));
          else setQuestionIndex((i) => Math.max(i - 1, 0));
          break;
        case "j":
        case "arrowdown":
          e.preventDefault();
          if (visitIndex < visitQueue.length - 1) void loadVisitAt(visitIndex + 1, visitQueue);
          break;
        case "k":
        case "arrowup":
          e.preventDefault();
          if (visitIndex > 0) void loadVisitAt(visitIndex - 1, visitQueue);
          break;
        case "m":
          e.preventDefault();
          void markReviewed();
          break;
        case "s":
          e.preventDefault();
          skipVisit();
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activePanel,
      visitLoading,
      queueLoading,
      actionPending,
      photoItems.length,
      questionItems.length,
      visitIndex,
      visitQueue.length,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // ── Render ───────────────────────────────────────────────────────────────

  const visitTitle = currentJob
    ? `${currentJob.customer?.title ?? "?"} · ${currentJob.store?.title ?? "?"}`
    : "No visit loaded";

  const queueProgressLabel = currentJob
    ? `Visit ${visitIndex + 1} of ${visitQueue.length}`
    : "No visits in queue";
  const itemProgressLabel =
    activePanel === "photos"
      ? photoItems.length > 0
        ? `Photo ${photoIndex + 1} of ${photoItems.length}`
        : null
      : questionItems.length > 0
        ? `Question ${questionIndex + 1} of ${questionItems.length}`
        : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* ── Page header (Angular speed-review-page__header) ── */}
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Speed Review</h1>
          <p className="text-xs text-muted-foreground">Review photos and answers quickly</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {queueProgressLabel}
          </span>
          {currentJob && itemProgressLabel && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {itemProgressLabel}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowShortcutHelp((v) => !v)}
            title="Keyboard shortcuts (?)"
          >
            <HugeiconsIcon icon={KeyboardIcon} aria-hidden data-icon="inline-start" />
            Shortcuts
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/review">
              <HugeiconsIcon icon={CheckListIcon} aria-hidden data-icon="inline-start" />
              Classic review
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={queueLoading}
            onClick={() => void loadQueue()}
          >
            <HugeiconsIcon icon={RefreshIcon} aria-hidden data-icon="inline-start" />
            Refresh queue
          </Button>
        </div>
      </header>

      {showShortcutHelp && <ShortcutLegend />}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="flex w-72 flex-col border-r bg-card">
          <div className="space-y-2 border-b p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Queue</h2>
              <span className="text-xs text-muted-foreground">
                {filteredQueue.length !== visitQueue.length
                  ? `${filteredQueue.length} of ${visitQueue.length} submitted`
                  : `${visitQueue.length} submitted`}
              </span>
            </div>
            {queueCustomers.length > 1 && (
              <div className="space-y-1">
                <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Client
                </span>
                <Select
                  value={queueCustomerId == null ? "" : String(queueCustomerId)}
                  onValueChange={(v) => setQueueCustomerId(v === "" ? null : Number(v))}
                >
                  <SelectTrigger className="h-7 w-full text-xs">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clients</SelectItem>
                    {queueCustomers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title} ({c.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Search
              </span>
              <Input
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search client, store, visit #…"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {queueLoading ? (
              <LoadingState label="Loading queue…" className="min-h-32" />
            ) : queueError ? (
              <div className="p-3">
                <p className="mb-2 text-xs text-destructive">{queueError}</p>
                <Button size="sm" variant="outline" onClick={() => loadQueue()}>
                  Retry
                </Button>
              </div>
            ) : filteredQueue.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No visits in queue.</p>
            ) : (
              filteredQueue.map((visit) => {
                const isActive = currentJob?.id === visit.id;
                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => {
                      const idx = visitQueue.findIndex((v) => v.id === visit.id);
                      if (idx >= 0 && !isActive) void loadVisitAt(idx, visitQueue);
                    }}
                    className={cn(
                      "w-full border-b px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40",
                      isActive && "bg-primary/10 font-medium",
                    )}
                  >
                    <div className="truncate font-medium">{visit.customer?.title ?? "?"}</div>
                    <div className="truncate text-muted-foreground">
                      #{visit.id} · {visit.store?.title ?? "?"} · {visit.cycle?.title ?? ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {visitLoading ? (
            <LoadingState label="Loading visit…" className="flex-1" />
          ) : !currentJob ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {visitQueue.length === 0 && !queueLoading
                  ? "All visits reviewed!"
                  : "Select a visit from the queue."}
              </p>
            </div>
          ) : (
            <>
              {/* Visit header */}
              <div className="flex items-center gap-4 border-b bg-card px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{visitTitle}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentJob.program?.title} · {currentJob.cycle?.title}
                    {currentJob.assignments?.length
                      ? ` · ${currentJob.assignments.map((a) => `${a.assignee.first_name} ${a.assignee.last_name}`).join(", ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Visit {visitIndex + 1} of {visitQueue.length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={skipVisit}
                    disabled={actionPending}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    disabled={pendingPhotosCount > 0 || actionPending}
                    onClick={() => void markReviewed()}
                  >
                    Mark Reviewed (M)
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b bg-card">
                {(["photos", "questions"] as SpeedReviewPanel[]).map((panel) => {
                  const count = panel === "photos" ? photoItems.length : questionItems.length;
                  return (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setActivePanel(panel)}
                      className={cn(
                        "border-b-2 px-4 py-2 text-sm capitalize transition-colors",
                        activePanel === panel
                          ? "border-primary font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {panel} ({count})
                    </button>
                  );
                })}
                {pendingPhotosCount > 0 && (
                  <span className="ml-auto self-center pr-4 text-xs text-amber-600">
                    {pendingPhotosCount} photo{pendingPhotosCount !== 1 ? "s" : ""} still
                    pending
                  </span>
                )}
              </div>

              {/* Photo panel */}
              {activePanel === "photos" && (
                <div className="flex flex-1 overflow-hidden">
                  {/* Main photo */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    {photoItems.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        No photos on this visit.
                      </div>
                    ) : (
                      <>
                        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/80">
                          {currentPhotoItem && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={currentPhotoItem.photoResponse.photo_location}
                              alt="Visit photo"
                              className="max-h-full max-w-full object-contain"
                            />
                          )}
                          {/* Status badge */}
                          {currentPhotoItem && (
                            <span
                              className={cn(
                                "absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                currentPhotoItem.photoResponse.status === "accepted" &&
                                  "bg-green-500 text-white",
                                currentPhotoItem.photoResponse.status === "rejected" &&
                                  "bg-red-500 text-white",
                                currentPhotoItem.photoResponse.status === "pending" &&
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {currentPhotoItem.photoResponse.status}
                            </span>
                          )}
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center gap-2 border-t bg-card p-2">
                          <span className="text-xs text-muted-foreground">
                            Photo {photoIndex + 1} of {photoItems.length}
                          </span>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending}
                            onClick={() => setPhotoIndex((i) => Math.max(i - 1, 0))}
                          >
                            ← Prev
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              currentPhotoItem?.photoResponse.status === "accepted"
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              currentPhotoItem?.photoResponse.status === "accepted" &&
                                "bg-green-600 hover:bg-green-700",
                            )}
                            disabled={actionPending}
                            onClick={acceptPhoto}
                          >
                            Accept (A)
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              currentPhotoItem?.photoResponse.status === "rejected"
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              currentPhotoItem?.photoResponse.status === "rejected" &&
                                "bg-red-600 hover:bg-red-700",
                            )}
                            disabled={actionPending}
                            onClick={rejectPhoto}
                          >
                            Reject (R)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending}
                            onClick={openFeedback}
                          >
                            Feedback (F)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending}
                            onClick={() =>
                              setPhotoIndex((i) => Math.min(i + 1, photoItems.length - 1))
                            }
                          >
                            Next →
                          </Button>
                        </div>

                        {/* Feedback display */}
                        {currentPhotoItem?.photoResponse.feedback && (
                          <div className="border-t bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                            Feedback: {currentPhotoItem.photoResponse.feedback}
                          </div>
                        )}

                        {/* Request description */}
                        {currentPhotoItem?.photoRequest.description && (
                          <div className="border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                            {currentPhotoItem.photoRequest.description}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Thumbnail strip */}
                  {photoItems.length > 1 && (
                    <aside className="w-24 flex-shrink-0 overflow-y-auto border-l bg-card">
                      {photoItems.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPhotoIndex(i)}
                          className={cn(
                            "relative w-full border-b p-1",
                            i === photoIndex && "ring-2 ring-primary ring-inset",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.photoResponse.photo_location}
                            alt={`Photo ${i + 1}`}
                            loading="lazy"
                            className="h-16 w-full object-cover"
                          />
                          <span
                            className={cn(
                              "absolute right-1 bottom-1 size-2.5 rounded-full border border-white",
                              item.photoResponse.status === "accepted" && "bg-green-500",
                              item.photoResponse.status === "rejected" && "bg-red-500",
                              item.photoResponse.status === "pending" && "bg-yellow-400",
                            )}
                          />
                        </button>
                      ))}
                    </aside>
                  )}
                </div>
              )}

              {/* Question panel */}
              {activePanel === "questions" && (
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {questionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions on this visit.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Question {questionIndex + 1} of {questionItems.length}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuestionIndex((i) => Math.max(i - 1, 0))}
                        >
                          ← Prev
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setQuestionIndex((i) => Math.min(i + 1, questionItems.length - 1))
                          }
                        >
                          Next →
                        </Button>
                      </div>

                      {currentQuestionItem && (
                        <div className="space-y-3 rounded-lg border bg-card p-4">
                          <div>
                            <p className="text-sm font-medium">
                              {currentQuestionItem.questionRequest.description || "Question"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {currentQuestionItem.questionRequest.kind || "text"}
                            </p>
                          </div>
                          {currentQuestionItem.questionResponse ? (
                            <div className="rounded-md bg-muted/30 p-3 text-sm">
                              {typeof currentQuestionItem.questionResponse.answer_data ===
                              "boolean"
                                ? currentQuestionItem.questionResponse.answer_data
                                  ? "Yes"
                                  : "No"
                                : Array.isArray(
                                      currentQuestionItem.questionResponse.answer_data,
                                    )
                                  ? (
                                      currentQuestionItem.questionResponse
                                        .answer_data as unknown[]
                                    ).join(", ")
                                  : String(
                                      currentQuestionItem.questionResponse.answer_data ?? "—",
                                    )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No answer submitted.
                            </p>
                          )}
                          {currentQuestionItem.questionResponse?.answered_by && (
                            <p className="text-xs text-muted-foreground">
                              Answered by{" "}
                              {currentQuestionItem.questionResponse.answered_by.first_name}{" "}
                              {currentQuestionItem.questionResponse.answered_by.last_name}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Question minimap */}
                      <div className="flex flex-wrap gap-1.5">
                        {questionItems.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setQuestionIndex(i)}
                            className={cn(
                              "rounded border px-2 py-0.5 text-xs",
                              i === questionIndex && "border-primary bg-primary/10 font-medium",
                              !item.questionResponse && "text-muted-foreground",
                            )}
                          >
                            Q{i + 1}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Photo feedback</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Feedback is visible to other users.</p>
          <textarea
            rows={4}
            value={feedbackDraft}
            onChange={(e) => setFeedbackDraft(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveFeedback()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
