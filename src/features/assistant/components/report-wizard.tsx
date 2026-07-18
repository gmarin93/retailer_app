"use client";

import {
  AiMagicIcon,
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckListIcon,
  CodeIcon,
  Download01Icon,
  File01Icon,
  JusticeScale01Icon,
  Mail01Icon,
  Message01Icon,
  NoteIcon,
  Pdf02Icon,
  SentIcon,
  TableIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useState } from "react";
import { ApiError } from "@/shared/services/api";
import { cn } from "@/shared/lib/utils";
import {
  emailAssistantReport,
  previewAssistantReport,
  renderAssistantReport,
} from "../api";
import type { KlikinReportFile, KlikinReportFormat, KlikinReportPreview } from "../schemas";

interface ReportChoice {
  value: string;
  label: string;
  icon: IconSvgElement;
  hint?: string;
}

const REPORT_TYPES: ReportChoice[] = [
  {
    value: "conversation_summary",
    label: "Conversation Summary",
    icon: NoteIcon,
    hint: "What was asked, found and concluded",
  },
  {
    value: "executive_summary",
    label: "Executive Summary",
    icon: File01Icon,
    hint: "Key findings and next steps, for a business audience",
  },
  {
    value: "technical_report",
    label: "Technical Report",
    icon: CodeIcon,
    hint: "Technical details, approaches and conclusions",
  },
  {
    value: "action_items",
    label: "Action Items",
    icon: CheckListIcon,
    hint: "Every task and follow-up mentioned",
  },
  {
    value: "decisions",
    label: "Decisions Made",
    icon: JusticeScale01Icon,
    hint: "Decisions with their rationale",
  },
  {
    value: "meeting_minutes",
    label: "Meeting Minutes",
    icon: UserGroupIcon,
    hint: "Topics, outcomes and follow-ups",
  },
  {
    value: "full_conversation",
    label: "Full Conversation",
    icon: Message01Icon,
    hint: "Verbatim transcript, no AI rewriting",
  },
  {
    value: "custom",
    label: "Custom Report",
    icon: AiMagicIcon,
    hint: "Describe what you want below",
  },
];

const REPORT_FORMATS: { value: KlikinReportFormat; label: string; icon: IconSvgElement }[] = [
  { value: "pdf", label: "PDF", icon: Pdf02Icon },
  { value: "xlsx", label: "Excel", icon: TableIcon },
  { value: "md", label: "Markdown", icon: CodeIcon },
  { value: "txt", label: "Plain text", icon: NoteIcon },
];

const REPORT_OPTIONS: { key: string; label: string }[] = [
  { key: "include_user_prompts", label: "User prompts" },
  { key: "include_ai_responses", label: "AI responses" },
  { key: "include_code", label: "Code snippets" },
  { key: "include_action_items", label: "Action items" },
  { key: "include_decisions", label: "Decisions" },
  { key: "include_recommendations", label: "Recommendations" },
];

function reportErrorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired — please log in again.";
    if (error.status === 429) return "Too many report requests — wait a minute and try again.";
    return error.message || fallback;
  }
  return fallback;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400" />
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400 [animation-delay:0.2s]" />
      <span className="size-1.5 animate-[klikin-blink_1.2s_infinite] rounded-full bg-slate-400 [animation-delay:0.4s]" />
    </span>
  );
}

interface ReportWizardProps {
  history: unknown[];
  onClose: () => void;
}

/** Smart report wizard: type → preview → download / email (Angular klikin-report). */
export function ReportWizard({ history, onClose }: ReportWizardProps) {
  const [step, setStep] = useState<"setup" | "preview" | "email">("setup");
  const [reportType, setReportType] = useState("conversation_summary");
  const [reportFormat, setReportFormat] = useState<KlikinReportFormat>("pdf");
  const [instructions, setInstructions] = useState("");
  const [options, setOptions] = useState<Record<string, boolean>>({
    include_user_prompts: true,
    include_ai_responses: true,
    include_code: true,
    include_action_items: false,
    include_decisions: false,
    include_recommendations: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<KlikinReportPreview | null>(null);
  const [file, setFile] = useState<KlikinReportFile | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState("");

  async function generatePreview() {
    if (loading) return;
    setLoading(true);
    setError("");
    setFile(null);
    try {
      const result = await previewAssistantReport({
        history,
        reportType,
        options,
        instructions: instructions.trim() || undefined,
      });
      setPreview(result);
      setEmailSubject(result.title);
      setStep("preview");
    } catch (err) {
      setError(reportErrorText(err, "The report could not be generated."));
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    if (!preview || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await renderAssistantReport(preview.report_id, reportFormat);
      setFile(result);
      window.open(result.download_url, "_blank", "noopener");
    } catch (err) {
      setError(reportErrorText(err, "The file could not be generated."));
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail() {
    if (!preview || emailSending) return;
    const recipients = emailTo
      .split(/[,;\s]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (!recipients.length) {
      setError("Enter at least one recipient.");
      return;
    }
    const invalid = recipients.find((r) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r));
    if (invalid) {
      setError(`"${invalid}" is not a valid email address.`);
      return;
    }
    setEmailSending(true);
    setError("");
    try {
      const result = await emailAssistantReport({
        reportId: preview.report_id,
        format: reportFormat,
        to: recipients,
        subject: emailSubject.trim() || undefined,
        message: emailMessage.trim() || undefined,
      });
      setEmailSent(
        `Sent to ${result.to.join(", ")} with ${result.attached ?? "the report"} attached.`,
      );
      setEmailTo("");
      setEmailMessage("");
    } catch (err) {
      setError(reportErrorText(err, "The email could not be sent."));
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-400/20 px-4 py-2.5">
        {step !== "setup" ? (
          <button
            type="button"
            className="flex text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Back"
            onClick={() => setStep(step === "email" ? "preview" : "setup")}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
          </button>
        ) : null}
        <p className="m-0 flex-1 text-sm font-semibold text-slate-200">
          {step === "setup" ? "Export smart report" : step === "preview" ? "Preview" : "Send by email"}
        </p>
        <button
          type="button"
          className="flex text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Close report wizard"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </button>
      </div>

      {step === "setup" ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            <p className="mb-1.5 text-[11px] tracking-wide text-slate-400 uppercase">Report type</p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setReportType(t.value)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-[10px] border px-2.5 py-2 text-left text-xs text-slate-200",
                    reportType === t.value
                      ? "border-violet-500 bg-indigo-500/18"
                      : "border-slate-400/25 bg-slate-800",
                  )}
                >
                  <HugeiconsIcon icon={t.icon} className="size-[18px] text-indigo-300" />
                  <span className="font-semibold">{t.label}</span>
                  {t.hint ? <span className="text-[11px] text-slate-400">{t.hint}</span> : null}
                </button>
              ))}
            </div>

            {reportType === "custom" ? (
              <textarea
                className="mt-2.5 w-full resize-y rounded-[10px] border border-slate-400/25 bg-slate-800 px-2.5 py-2 text-[13px] text-slate-200 outline-none focus:border-indigo-500"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Only the code examples, or the authentication discussion"
              />
            ) : null}

            <p className="mt-3.5 mb-1.5 text-[11px] tracking-wide text-slate-400 uppercase">Format</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setReportFormat(f.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs text-slate-200",
                    reportFormat === f.value
                      ? "border-violet-500/55 bg-indigo-500/12"
                      : "border-slate-400/25 bg-slate-800",
                  )}
                >
                  <HugeiconsIcon icon={f.icon} className="size-[18px] text-indigo-300" />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <p className="mt-3.5 mb-1.5 text-[11px] tracking-wide text-slate-400 uppercase">Include</p>
            <div className="grid grid-cols-2 gap-1.5">
              {REPORT_OPTIONS.map((o) => (
                <label
                  key={o.key}
                  className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={options[o.key]}
                    onChange={() =>
                      setOptions((prev) => ({ ...prev, [o.key]: !prev[o.key] }))
                    }
                    className="accent-indigo-500"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-400/20 px-4 py-3">
            {error ? <p className="m-0 text-[13px] text-red-400">{error}</p> : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void generatePreview()}
              className="flex items-center justify-center gap-2 rounded-[10px] bg-linear-to-br from-indigo-500 to-violet-500 px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <TypingDots />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={AiMagicIcon} className="size-[18px]" />
                  <span>Generate preview</span>
                </>
              )}
            </button>
          </div>
        </>
      ) : null}

      {step === "preview" && preview ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            <p className="mb-2.5 text-[15px] font-bold text-slate-200">{preview.title}</p>
            <div className="rounded-[10px] border border-slate-400/20 bg-slate-800 p-3">
              {preview.sections.map((s, i) => (
                <div key={`${s.heading}-${i}`}>
                  {s.heading ? (
                    <p className="mt-2.5 mb-1 text-[13px] font-semibold text-indigo-200 first:mt-0">
                      {s.heading}
                    </p>
                  ) : null}
                  <p className="mb-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-200">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-400/20 px-4 py-3">
            {error ? <p className="m-0 text-[13px] text-red-400">{error}</p> : null}
            {file ? (
              <a
                href={file.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2 py-1.5 text-[13px] text-indigo-200 no-underline"
              >
                <HugeiconsIcon icon={Download01Icon} className="size-[18px]" />
                <span className="truncate">{file.filename}</span>
              </a>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void download()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-linear-to-br from-indigo-500 to-violet-500 px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                <HugeiconsIcon icon={Download01Icon} className="size-[18px]" />
                <span>{loading ? "Preparing…" : `Download ${reportFormat.toUpperCase()}`}</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep("email");
                  setError("");
                  setEmailSent("");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-slate-400/35 bg-transparent px-3 py-2.5 text-[13px] font-semibold text-slate-200 disabled:opacity-50"
              >
                <HugeiconsIcon icon={Mail01Icon} className="size-[18px]" />
                <span>Send by email</span>
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === "email" && preview ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            <label className="mb-3 flex flex-col gap-1 text-xs text-slate-400">
              <span>To (comma-separated)</span>
              <input
                type="text"
                value={emailTo}
                disabled={emailSending}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="ops@company.com, manager@company.com"
                className="rounded-[10px] border border-slate-400/25 bg-slate-800 px-2.5 py-2 text-[13px] text-slate-200 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mb-3 flex flex-col gap-1 text-xs text-slate-400">
              <span>Subject</span>
              <input
                type="text"
                value={emailSubject}
                disabled={emailSending}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="rounded-[10px] border border-slate-400/25 bg-slate-800 px-2.5 py-2 text-[13px] text-slate-200 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mb-3 flex flex-col gap-1 text-xs text-slate-400">
              <span>Message (optional)</span>
              <textarea
                rows={3}
                value={emailMessage}
                disabled={emailSending}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="A short note for the recipients"
                className="resize-y rounded-[10px] border border-slate-400/25 bg-slate-800 px-2.5 py-2 text-[13px] text-slate-200 outline-none focus:border-indigo-500"
              />
            </label>
            <p className="m-0 text-xs text-slate-400">
              Attachment: {preview.title} ({reportFormat.toUpperCase()})
            </p>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-400/20 px-4 py-3">
            {error ? <p className="m-0 text-[13px] text-red-400">{error}</p> : null}
            {emailSent ? <p className="m-0 text-[13px] text-green-400">{emailSent}</p> : null}
            <button
              type="button"
              disabled={emailSending || !emailTo.trim()}
              onClick={() => void sendEmail()}
              className="flex items-center justify-center gap-2 rounded-[10px] bg-linear-to-br from-indigo-500 to-violet-500 px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {emailSending ? (
                <>
                  <TypingDots />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={SentIcon} className="size-[18px]" />
                  <span>Send report</span>
                </>
              )}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
