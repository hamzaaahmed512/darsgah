create policy internal_support_queries_staff_delete
  on public.internal_support_queries for delete using (
    submitted_by = auth.uid()
  );
