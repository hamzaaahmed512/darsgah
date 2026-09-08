import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookCopy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getLibrary } from "@/lib/services/library";
import { hasPermission } from "@/lib/permissions";
import { updateCopyStatusAction } from "../actions";

function CopyStatus({ status }: { status: string }) {
  const palette = status === "available" ? "bg-emerald-50 text-emerald-700" : status === "on_loan" ? "bg-amber-50 text-amber-700" : status === "damaged" ? "bg-orange-50 text-orange-700" : status === "lost" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${palette}`}>{status.replaceAll("_", " ")}</span>;
}

export default async function BookInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("library:view");
  const data = await getLibrary(user);
  const book = data.books.find((item) => item.id === id);
  if (!book) notFound();

  const copies = data.copies.filter((copy) => copy.book_id === book.id);
  const currentLoans = new Map(data.loans.filter((loan) => !loan.returned_at).map((loan) => [loan.copy_id, loan]));
  const canManage = hasPermission(user.role, "library:manage", user.permissions);

  return <>
    <Link href="/library" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to library</Link>
    <PageHeader eyebrow="Book inventory" title={book.title} description={`${book.author || "Unknown author"} · ${copies.length} ${copies.length === 1 ? "copy" : "copies"}`} />
    <Card className="rounded-[30px] border border-outline/70 bg-white shadow-card">
      <CardHeader className="border-b border-outline/50 pb-5">
        <CardTitle className="flex items-center gap-2 text-[1.5rem]"><BookCopy className="h-5 w-5 text-primary" /> Copy inventory</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {!copies.length ? <p className="text-sm text-muted">No copies have been added for this book.</p> : <div className="overflow-x-auto rounded-2xl border border-outline/60"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50/80 font-label text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-5 py-4">Copy ID</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Replacement cost</th><th className="px-5 py-4">Borrower</th><th className="px-5 py-4">Due date</th></tr></thead><tbody>{copies.map((copy) => { const loan = currentLoans.get(copy.id); return <tr key={copy.id} className="border-t border-outline/50"><td className="px-5 py-4 font-semibold text-ink">{copy.accession}</td><td className="px-5 py-4">{canManage && copy.status !== "on_loan" ? <form action={updateCopyStatusAction} className="flex items-center gap-2"><input type="hidden" name="id" value={copy.id} /><input type="hidden" name="book_id" value={book.id} /><select name="status" defaultValue={copy.status} className="rounded-lg border border-outline bg-white px-2.5 py-1.5 text-sm font-semibold capitalize text-ink"><option value="available">Available</option><option value="damaged">Damaged</option><option value="lost">Lost</option><option value="withdrawn">Withdrawn</option></select><button type="submit" className="text-xs font-bold text-primary hover:underline">Save</button></form> : <CopyStatus status={copy.status} />}</td><td className="px-5 py-4">{copy.replacement_cost == null ? <span className="text-muted">Not specified</span> : `Rs ${Number(copy.replacement_cost).toLocaleString("en-PK")}`}</td><td className="px-5 py-4">{loan?.borrower_name ?? <span className="text-muted">—</span>}</td><td className="px-5 py-4">{loan?.due_date ? new Date(loan.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-muted">—</span>}</td></tr>; })}</tbody></table></div>}
      </CardContent>
    </Card>
  </>;
}
