"use client";

import { PageHeader } from "@/shared/components/page-header";
import { AnnouncementsCard } from "./announcements-card";
import { MobileAppVersionsCard } from "./mobile-app-versions-card";

export function SettingsView() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <MobileAppVersionsCard />
      <AnnouncementsCard />
    </div>
  );
}
