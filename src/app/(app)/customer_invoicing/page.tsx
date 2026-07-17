import { Suspense } from "react";
import { LoadingState } from "@/shared/components/loading-state";
import { CustomerInvoiceStudioView } from "@/features/invoicing/components/customer-invoice-studio-view";

export const metadata = { title: "Customer Invoice Studio" };

export default function CustomerInvoicingPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-60" />}>
      <CustomerInvoiceStudioView />
    </Suspense>
  );
}
