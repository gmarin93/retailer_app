"use client";

import { PageHeader } from "@/shared/components/page-header";
import { AnnouncementsCard } from "./announcements-card";
import { AppearanceCard } from "./appearance-card";
import { MobileAppVersionsCard } from "./mobile-app-versions-card";

export function SettingsView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <AppearanceCard />
      <MobileAppVersionsCard />
      <AnnouncementsCard />
    </div>
  );
}
