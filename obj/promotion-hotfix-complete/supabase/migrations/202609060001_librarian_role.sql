-- Commit the enum value before using it in the library migration.
alter type public.app_role add value if not exists 'librarian';
