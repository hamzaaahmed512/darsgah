import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function AcademicControlPage() {
  const user = await requireUser("academics:view");
  if (user.role !== "principal") redirect("/academics");
  redirect("/exam-approvals");
}
