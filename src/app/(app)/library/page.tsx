import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getLibrary } from "@/lib/services/library";
import { PageHeader } from "@/components/layout/page-header";
import { LibraryWorkspace } from "@/components/library/library-workspace";

export default async function LibraryPage() {
  const user = await requireUser("library:view");
  let data;
  try { data = await getLibrary(user); } catch (error) {
    if (!(error instanceof Error) || error.message !== "LIBRARY_MIGRATION_REQUIRED") throw error;
    return <><PageHeader title="Library" description="Catalogue, circulation, and borrowing records." /><div className="rounded-2xl border border-outline bg-white p-8"><h2 className="text-lg font-bold">Library setup required</h2><p className="mt-2 text-muted">The library database update must be applied before books can be added. Contact your system administrator to complete setup.</p></div></>;
  }
  return <><PageHeader eyebrow="Operations" title="Library" description="A place for every book. A clear record of every loan." actions={user.role === "principal" || user.role === "administrator" ? <Link href="/admin" className="rounded-xl border border-outline bg-white px-4 py-3 text-sm font-semibold">Assign librarian</Link> : undefined} />
    <LibraryWorkspace data={data} canManage={hasPermission(user.role, "library:manage", user.permissions)} canAdmin={user.role === "principal" || user.role === "administrator"} />
  </>;
}
