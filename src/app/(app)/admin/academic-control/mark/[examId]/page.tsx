import { redirect } from "next/navigation";

export default async function PrincipalMarkAssessmentPage() {
  redirect("/exam-approvals");
}

