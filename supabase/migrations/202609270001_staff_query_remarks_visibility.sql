-- Query submitters need to see the responses and remarks attached to their own queries.
create policy internal_support_query_remarks_submitter_select
  on public.internal_support_query_remarks for select using (
    exists (
      select 1
      from public.internal_support_queries q
      where q.id = internal_support_query_remarks.query_id
        and q.school_id = internal_support_query_remarks.school_id
        and q.submitted_by = auth.uid()
    )
  );
