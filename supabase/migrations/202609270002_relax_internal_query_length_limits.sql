alter table public.internal_support_queries
  drop constraint if exists internal_support_queries_subject_check,
  drop constraint if exists internal_support_queries_message_check;

alter table public.internal_support_queries
  add constraint internal_support_queries_subject_check check (char_length(btrim(subject)) between 1 and 160),
  add constraint internal_support_queries_message_check check (char_length(btrim(message)) between 1 and 3000);
