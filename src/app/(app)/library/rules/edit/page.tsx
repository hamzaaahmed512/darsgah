import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLibrary } from "@/lib/services/library";
import { PageHeader } from "@/components/layout/page-header";
import { LibraryRulesForm } from "@/components/library/library-rules-form";

export default async function EditLibraryRulesPage() {
  const user = await requireUser("library:manage");
  if (user.role !== "principal" && user.role !== "administrator") redirect("/library");
  const data = await getLibrary(user);

  return <>
    <PageHeader eyebrow="Library" title="Edit borrowing rules" description="Set borrowing limits, renewal periods, and overdue fines for students and staff." />
    <LibraryRulesForm settings={data.settings} />
  </>;
}
