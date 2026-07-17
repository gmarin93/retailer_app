"use client";

import { File01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import { useAllPlanDocuments } from "../hooks";
import { formatPlanDocumentSize, type PlanDocument } from "../schemas";

/** Icon tint per file type, ported from `planDocumentIconColor`. */
export function docIconColor(fileType: string): string {
  const lower = (fileType || "").toLowerCase();
  if (lower.includes("pdf")) return "text-red-500";
  if (lower.includes("xls") || lower.includes("csv")) return "text-green-600";
  if (lower.includes("doc")) return "text-blue-600";
  return "text-muted-foreground";
}

export function DocumentList({ documents }: { documents: PlanDocument[] }) {
  return (
    <ul className="divide-y">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 py-2 text-sm">
          <HugeiconsIcon
            icon={File01Icon}
            aria-hidden="true"
            className={cn("size-5 shrink-0", docIconColor(doc.file_type))}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate">{doc.title}</p>
            {doc.size_bytes > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatPlanDocumentSize(doc.size_bytes)}
              </p>
            )}
          </div>
          {doc.download_url && (
            <Button asChild variant="ghost" size="icon" aria-label={`Download ${doc.title}`}>
              <a href={doc.download_url} download target="_blank" rel="noreferrer">
                <HugeiconsIcon icon={Download04Icon} aria-hidden="true" className="size-4" />
              </a>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function PlanDocumentsCard({
  documents,
  isLoading,
}: {
  documents: PlanDocument[];
  isLoading: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const allDocuments = useAllPlanDocuments(dialogOpen);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan documents</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No documents.</p>
        ) : (
          <>
            <DocumentList documents={documents} />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setDialogOpen(true)}
            >
              View documents
            </Button>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Plan documents</DialogTitle>
            <DialogDescription>All cycles</DialogDescription>
          </DialogHeader>
          {allDocuments.isLoading ? (
            <LoadingState label="Loading documents…" />
          ) : (allDocuments.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No documents.</p>
          ) : (
            <DocumentList documents={allDocuments.data ?? []} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
