import { redirect } from "next/navigation";
import MarksPage from "@/app/(app)/marks/page";
import ResultsPage from "@/app/(app)/results/page";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

export default async function AcademicResultsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("results:view");
  if (user.role === "principal") redirect("/admin/academic-control");
  if (hasPermission(user.role, "marks:manage", user.permissions)) return <MarksPage searchParams={props.searchParams} />;
  return <ResultsPage searchParams={props.searchParams} />;
}
