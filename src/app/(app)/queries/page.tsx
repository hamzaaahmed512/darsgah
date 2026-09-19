import { CheckCircle2, Forward, Inbox, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AddQueryRemark } from "@/components/help/add-query-remark";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateInternalQueryAction } from "@/app/(app)/help/actions";

type Remark = { id: string; query_id: string; remark: string; author_role: "principal" | "administrator"; created_at: string; profiles: { full_name: string } | { full_name: string }[] | null };

function profileName(profile: { full_name: string } | { full_name: string }[] | null) {
  return Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
}

export default async function QueriesPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator" && user.role !== "principal") return <EmptyState title="Queries are for school leadership" description="Staff can submit their query from Help & Support." />;
  const db = await createClient();
  const { data, error } = await db.from("internal_support_queries").select("id,subject,message,status,assigned_role,created_at,profiles!internal_support_queries_submitted_by_fkey(full_name)").eq("school_id", user.schoolId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const queries = data ?? [];
  const { data: remarks, error: remarksError } = queries.length
    ? await db.from("internal_support_query_remarks").select("id,query_id,remark,author_role,created_at,profiles!internal_support_query_remarks_author_id_fkey(full_name)").eq("school_id", user.schoolId).in("query_id", queries.map((query) => query.id)).order("created_at", { ascending: true })
    : { data: [], error: null };
  if (remarksError) throw new Error(remarksError.message);
  const remarksByQuery = new Map<string, Remark[]>();
  for (const remark of (remarks ?? []) as Remark[]) remarksByQuery.set(remark.query_id, [...(remarksByQuery.get(remark.query_id) ?? []), remark]);

  return <>
    <PageHeader eyebrow="Support" title="Staff Queries" description="Review staff questions, add remarks, mark them solved, or pass them to the other school leader." />
    <section className="mb-5 grid gap-4 sm:grid-cols-3">
      <Metric label="Open" value={queries.filter((item) => item.status === "open").length} icon={Inbox} tone="blue" />
      <Metric label="Assigned to me" value={queries.filter((item) => item.status === "open" && item.assigned_role === user.role).length} icon={MessageSquareText} tone="amber" />
      <Metric label="Solved" value={queries.filter((item) => item.status === "solved").length} icon={CheckCircle2} tone="green" />
    </section>
    {queries.length ? <section className="overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
      <div className="border-b border-blue-200 px-5 py-4"><h2 className="font-display text-xl font-bold text-ink">Query inbox</h2></div>
      {queries.map((query) => <article key={query.id} className="border-b border-blue-100 p-5 last:border-b-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink">{query.subject}</h3><Badge tone={query.status === "solved" ? "green" : "yellow"}>{query.status === "solved" ? "Solved" : "Open"}</Badge><Badge tone="blue">For {query.assigned_role}</Badge></div>
            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted">{query.message}</p>
            <p className="mt-3 text-xs font-semibold text-muted">From {profileName(query.profiles) ?? "Staff member"} · {new Date(query.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <AddQueryRemark queryId={query.id} />
            {query.status === "open" && <>
              <form action={updateInternalQueryAction.bind(null, query.id, "solved")}><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3.5 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Mark solved</button></form>
              <form action={updateInternalQueryAction.bind(null, query.id, "handoff")}><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-50 px-3.5 text-sm font-bold text-primary"><Forward className="h-4 w-4" />Send to {user.role === "principal" ? "Admin" : "Principal"}</button></form>
            </>}
          </div>
        </div>
        {(remarksByQuery.get(query.id)?.length ?? 0) > 0 && <div className="mt-5 max-w-3xl space-y-3 border-t border-outline/50 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Remarks</h4>
          {remarksByQuery.get(query.id)?.map((remark) => <div key={remark.id} className="rounded-xl border border-outline/60 bg-slate-50/70 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{remark.remark}</p>
            <p className="mt-2 text-xs font-semibold text-muted">{profileName(remark.profiles) ?? (remark.author_role === "principal" ? "Principal" : "Admin")} · {remark.author_role === "principal" ? "Principal" : "Admin"} · {new Date(remark.created_at).toLocaleString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>)}
        </div>}
      </article>)}
    </section> : <EmptyState title="No staff queries" description="New staff queries will appear here." />}
  </>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Inbox; tone: "blue" | "amber" | "green" }) {
  const styles = { blue: "bg-blue-50 text-primary ring-blue-100", amber: "bg-amber-50 text-amber-600 ring-amber-100", green: "bg-emerald-50 text-emerald-600 ring-emerald-100" };
  return <div className="rounded-[18px] border border-slate-200 border-t-4 border-t-blue-500 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${styles[tone]}`}><Icon className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p></div></div></div>;
}
