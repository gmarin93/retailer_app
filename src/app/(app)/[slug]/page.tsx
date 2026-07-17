import { notFound } from "next/navigation";
import { FolderOpenIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { ALL_PAGES, isPageEnabled } from "@/shared/constants/pages";

/**
 * Catch-all for registered pages that have not been migrated yet. Keeps every
 * sidebar link functional during the incremental migration; each vertical
 * replaces its slug here with a real route directory as it is ported.
 */
export default async function PendingMigrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = ALL_PAGES.find((entry) => entry.id === slug);

  if (!page || !isPageEnabled(page.id)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={page.title} />
      <EmptyState
        icon={FolderOpenIcon}
        title={`${page.title} hasn't been migrated yet`}
        description="This section is still served by the current application. It will appear here as the migration progresses — see MIGRATION_PLAN.md for the order."
      />
    </div>
  );
}
