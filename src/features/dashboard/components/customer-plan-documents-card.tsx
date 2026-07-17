"use client";

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
import { useAllCustomerPlanDocuments, useCustomerPlanDocuments } from "../customer-hooks";
import { DocumentList } from "./plan-documents-card";

/** Plan documents scoped to the selected client (Note 167). */
export function CustomerPlanDocumentsCard({ customerId }: { customerId: number | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const preview = useCustomerPlanDocuments(customerId);
  const allDocuments = useAllCustomerPlanDocuments(customerId, dialogOpen);
  const documents = preview.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan documents</CardTitle>
      </CardHeader>
      <CardContent>
        {preview.isLoading ? (
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
