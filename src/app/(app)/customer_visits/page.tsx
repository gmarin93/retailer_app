import type { Metadata } from "next";
import { CustomerVisitsView } from "@/features/customer-visits/components/customer-visits-view";

export const metadata: Metadata = { title: "Customer Visits Access" };

export default function CustomerVisitsPage() {
  return <CustomerVisitsView />;
}
