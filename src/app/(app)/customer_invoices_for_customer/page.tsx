import { Suspense } from "react";
import { LoadingState } from "@/shared/components/loading-state";
import { CustomerInvoiceListView } from "@/features/invoicing/components/customer-invoice-list-view";

export const metadata = { title: "Customer Invoices" };

export default function CustomerInvoicesForCustomerPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-60" />}>
      <CustomerInvoiceListView />
    </Suspense>
  );
}
