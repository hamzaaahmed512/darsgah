import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await requireUser("dashboard:view");

  if (user.role === "principal") {
    redirect("/dashboard/principal");
  } else if (user.role === "administrator") {
    redirect("/dashboard/admin");
  } else if (user.role === "student_staff") {
    redirect("/dashboard/registrar");
  } else if (user.role === "teacher" || user.role === "head_teacher") {
    redirect("/dashboard/teacher");
  }

  // Fallback
  redirect("/unauthorized");
}
