import { redirect } from "next/navigation";
import { getParentPortalSession } from "@/lib/parent-portal";

export default async function ParentPortalPage() {
  const session = await getParentPortalSession();
  if (!session) redirect("/parent-portal/sign-in");
  redirect(`/parent-portal/students/${session.studentId}`);
}
