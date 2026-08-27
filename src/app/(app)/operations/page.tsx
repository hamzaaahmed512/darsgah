import { requireUser } from "@/lib/auth/session";
import { getDailyOperationsCenter } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { DailyOperationsCenter } from "@/components/dashboard/daily-operations-center";

export default async function OperationsPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal" && user.role !== "administrator") {
    throw new Error("Unauthorized access to Daily Operations");
  }

  const operations = await getDailyOperationsCenter(user);

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Daily Operations"
        description="Review the operational items that need attention today and jump directly into the right workflow."
      />
      <DailyOperationsCenter items={operations} />
    </>
  );
}
