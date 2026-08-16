import { PageHeader } from "@/components/layout/page-header";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { requireUser } from "@/lib/auth/session";
import { getActivityLogs } from "@/lib/services/reports";

export default async function ActivityPage() {
  const user = await requireUser("activity:view");
  const activity = await getActivityLogs(user);
  return (
    <>
      <PageHeader eyebrow="Audit" title="Activity Logs" description="Important actions are stored with actor, entity, timestamp, and metadata." />
      <ActivityFeed items={activity as any[]} />
    </>
  );
}
