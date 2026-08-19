import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function SpecialExamsPage() {
  await requireUser("results:view");
  redirect("/results");
}
