"use client";

import { AttachmentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { DetailedJob } from "../schemas";

/**
 * Document chips matching Angular `job-documents-list` / `.job-document-chip`.
 */
export function JobDocumentsChips({ job }: { job: DetailedJob }) {
  if (job.documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents for this visit.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {job.documents.map((doc) => {
        const content = (
          <>
            <HugeiconsIcon
              icon={AttachmentIcon}
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{doc.title}</span>
          </>
        );
        return (
          <li key={doc.id}>
            {doc.location ? (
              <a
                href={doc.location}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-xs items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {content}
              </a>
            ) : (
              <span className="inline-flex max-w-xs items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
