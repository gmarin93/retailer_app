import { Suspense } from "react";
import { LoadingState } from "@/shared/components/loading-state";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading settings…" className="min-h-60" />}>
      <SettingsView />
    </Suspense>
  );
}
