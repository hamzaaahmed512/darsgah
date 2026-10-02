import { MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Remark = { id: string; query_id: string; remark: string; author_role: "principal" | "administrator"; created_at: string; profiles: { full_name: string } | { full_name: string }[] | null };

function profileName(profile: { full_name: string } | { full_name: string }[] | null) {
  return Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
}

export async function TeacherQueriesTable({ userId, schoolId }: { userId: string; schoolId: string }) {
  const db = await createClient();

  const { data, error } = await db.from("internal_support_queries")
    .select("id,subject,message,status,assigned_role,created_at,solved_at")
    .eq("school_id", schoolId)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });
    
  if (error) throw new Error(error.message);
  const queries = data ?? [];

  const { data: remarks, error: remarksError } = queries.length
    ? await createAdminClient().from("internal_support_query_remarks")
        .select("id,query_id,remark,author_role,created_at,profiles!internal_support_query_remarks_author_id_fkey(full_name)")
        .eq("school_id", schoolId)
        .in("query_id", queries.map((query) => query.id))
        .order("created_at", { ascending: true })
    : { data: [], error: null };
    
  if (remarksError) throw new Error(remarksError.message);

  const remarksByQuery = new Map<string, Remark[]>();
  for (const remark of (remarks ?? []) as Remark[]) {
    remarksByQuery.set(remark.query_id, [...(remarksByQuery.get(remark.query_id) ?? []), remark]);
  }

  if (queries.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title="No queries yet" description="You haven't submitted any queries yet." />
      </div>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary ring-1 ring-blue-100">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          </span>
          My Queries
        </h2>
        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
          {queries.length} {queries.length === 1 ? "query" : "queries"}
        </span>
      </div>
      <div className="query-table-scroll overflow-x-auto">
        <table className="min-w-[840px] w-full text-left text-sm">
          <caption className="sr-only">Your query history and leadership responses</caption>
          <thead className="bg-blue-50/40 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <tr>
              <th scope="col" className="px-5 py-4 sm:px-6">Query</th>
              <th scope="col" className="px-5 py-4">Sent</th>
              <th scope="col" className="px-5 py-4">Status</th>
              <th scope="col" className="px-5 py-4">Response</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((query) => {
              const queryRemarks = remarksByQuery.get(query.id) ?? [];
              return (
                <tr key={query.id} className="border-b border-slate-100 align-top transition hover:bg-blue-50/30 last:border-b-0">
                  <td className="max-w-sm px-5 py-5 sm:px-6">
                    <p className="font-bold text-ink">{query.subject}</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted">{query.message}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-muted">
                    {new Date(query.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    <p className="mt-1 text-xs">To {query.assigned_role === "principal" ? "Principal" : "Admin"}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-5">
                    <Badge tone={query.status === "solved" ? "green" : "yellow"}>
                      {query.status === "solved" ? "Solved" : "Open"}
                    </Badge>
                  </td>
                  <td className="min-w-[250px] px-5 py-5">
                    {queryRemarks.length ? (
                      <details className="group">
                        <summary className="cursor-pointer list-none font-semibold text-primary hover:text-primary-ink">
                          {queryRemarks.length} response{queryRemarks.length === 1 ? "" : "s"}
                          <span className="ml-1 text-muted group-open:hidden">· View</span>
                          <span className="ml-1 text-muted hidden group-open:inline">· Hide</span>
                        </summary>
                        <div className="mt-3 space-y-3">
                          {queryRemarks.map((remark) => (
                            <div key={remark.id} className="rounded-xl bg-blue-50/50 px-3.5 py-3">
                              <p className="whitespace-pre-wrap leading-6 text-ink">{remark.remark}</p>
                              <p className="mt-2 text-xs font-semibold text-muted">
                                {profileName(remark.profiles) ?? (remark.author_role === "principal" ? "Principal" : "Admin")} · {new Date(remark.created_at).toLocaleString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="text-muted">No response yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
