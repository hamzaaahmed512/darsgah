-- Enum additions must be committed before they can be used by the workflow migration.
alter type public.exam_type add value if not exists 'first_term';
alter type public.exam_type add value if not exists 'second_term';
alter type public.exam_type add value if not exists 'third_term';
alter type public.exam_status add value if not exists 'pending_approval';

