create policy internal_support_query_remarks_leadership_update
  on public.internal_support_query_remarks for update using (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  ) with check (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  );

create policy internal_support_query_remarks_leadership_delete
  on public.internal_support_query_remarks for delete using (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  );
