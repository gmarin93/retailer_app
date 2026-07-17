import type { Metadata } from "next";
import { ShowcaseView } from "@/features/showcase/components/showcase-view";

export const metadata: Metadata = { title: "Proof of Execution" };

export default function ShowcasePage() {
  return <ShowcaseView />;
}
