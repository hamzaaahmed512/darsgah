import { redirect } from "next/navigation";
import { AssessmentsView } from "@/components/marks/assessments-view";
import { requireUser } from "@/lib/auth/session";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";

export default async function AcademicControlPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("academics:view");
  if (user.role !== "principal") redirect("/academics");
  if (!(await principalCanAccessAcademicControl(user))) redirect("/unauthorized");

  return <AssessmentsView searchParams={props.searchParams} basePath="/admin/academic-control" />;
}
