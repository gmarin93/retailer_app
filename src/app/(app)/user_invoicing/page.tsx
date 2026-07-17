import { Suspense } from "react";
import { LoadingState } from "@/shared/components/loading-state";
import { UserInvoicingView } from "@/features/invoicing/components/user-invoicing-view";

export const metadata = { title: "User Invoicing" };

export default function UserInvoicingPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-60" />}>
      <UserInvoicingView />
    </Suspense>
  );
}
