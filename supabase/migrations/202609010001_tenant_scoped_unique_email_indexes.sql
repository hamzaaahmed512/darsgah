-- Migration: 202609010001_tenant_scoped_unique_email_indexes.sql
-- Description: Implement tenant-scoped unique email constraints across multi-tenant tables (students, guardians, school_members)

-- 1. Ensure composite tenant-scoped unique index on students(school_id, lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS students_school_id_lower_email_idx
  ON public.students (school_id, lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

-- 2. Ensure composite tenant-scoped unique index on guardians(school_id, lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS guardians_school_id_lower_email_idx
  ON public.guardians (school_id, lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

-- 3. Drop global unique constraint on profiles.email if it exists to support multi-tenant identity reuse,
-- while retaining index for fast lookup by email.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_email_key;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_lower_email_idx
  ON public.profiles (lower(trim(email)))
  WHERE email IS NOT NULL;
