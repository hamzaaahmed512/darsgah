# GoCampusFlow

GoCampusFlow is a complete multi-tenant school management SaaS application for principals, teachers, student-management staff, and administrators. The app is now configured to connect directly to a Supabase project, so the normal development flow is to run the Next.js app against your remote Supabase instance.

## Main Features

- Supabase Auth sign in, sign out, forgot password, reset password, protected routes, and role-aware redirect.
- Role-based dashboards for principals, administrators, student-management staff, and teachers.
- Student management with list, search, filters, profiles, add/edit forms, guardian details, attendance summary, and soft archival.
- Attendance workflow with class/date selection, status marking, notes, duplicate-safe upserts, and teacher assignment scoping.
- Teacher and staff directory with roles, departments, statuses, and assigned-class summaries.
- Academic structure for years, grades, classes, sections, subjects, assignments, and enrollments.
- Reports for attendance, enrollment counts, archived students, and activity logs with CSV export.
- Activity logging for important actions.
- Multi-school tenant isolation using `school_id` plus Supabase Row Level Security.

## Technology Stack

- Runtime: Node.js
- Framework: Next.js App Router with TypeScript
- Styling: Tailwind CSS
- Auth: Supabase Auth
- Database: Supabase PostgreSQL
- Validation: Zod
- Forms: React Hook Form
- Charts: Recharts
- Tests: Vitest

## Project Structure

```text
src/
  app/                    Next.js routes
  components/             UI, layout, dashboards, students, attendance, reports
  lib/
    auth/                 session and route guards
    services/             Supabase data access and writes
    supabase/             server/browser/middleware clients
    validation/           Zod schemas
    permissions.ts        role permissions
  types/
supabase/
  migrations/
  seed.sql
ARCHITECTURE.md
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project with a live database and Auth enabled
- Access to your project URL, anon key, and service role key

## Quick Start (direct Supabase connection)

This is the current default setup for the app.

1. Create a Supabase project if you have not already done so.
2. Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux:

```bash
cp .env.example .env.local
```

3. Fill in your project values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it in browser code.

4. Install dependencies:

```powershell
npm install
```

5. Start the app:

```powershell
npm run dev
```

6. Open the app in the browser at:

```text
http://localhost:3000
```

## Supabase Setup

Before the app works correctly, your Supabase project needs the schema and demo data.

1. Apply the migrations in `supabase/migrations/` in order.
2. Run `supabase/seed.sql` to load demo schools, classes, staff, students, and activity data.
3. Create the demo Auth users in the Supabase Auth dashboard, then re-run the seed file if needed so the final script can bind Auth users to school memberships.

Suggested demo users:

```text
principal@scholarly.test
admin@scholarly.test
teacher@scholarly.test
staff@scholarly.test
```

If you use the Supabase CLI linked to your project, you can push the migrations with:

```bash
npx supabase db push
```

You can also run the SQL files manually in the Supabase SQL editor in filename order. The migration files are:

- `202607110001_initial_schema.sql`
- `202607110002_add_grants.sql`
- `202607110003_approval_workflow.sql`
- `202607110004_fix_principal_student_update.sql`
- `202607110005_profile_details.sql`
- `202607110006_user_password_security.sql`
- `202607110007_head_teacher_attendance_rules.sql`
- `202607110008_exam_marks_results.sql`
- `202607120001_principal_class_management.sql`
- `202607120002_exam_results_workflow.sql`
- `202607130001_finance_module.sql`
- `202607140001_pakistan_erp_enhancements.sql`
- `202607150002_custom_roles_and_profile_improvements.sql`
- `202607160001_school_os_workflows.sql`

## Row Level Security

The migration enables RLS on every tenant-owned table. The core policies use:

- `app.can_access_school(school_id)`
- `app.has_school_role(school_id, roles[])`
- `app.is_teacher_for_class(school_id, class_id)`

Teachers can only read assigned-class students and submit attendance for assigned classes. Student-management staff can create, update, and archive students. Administrators can manage users, academic structure, and settings.

## Production Build

```powershell
npm run build
npm run start
```

## Testing, Linting, and Type Checking

```powershell
npm run typecheck
npm run lint
npm run test
```

## Optional Local Docker Setup

The Docker-based local Supabase stack is optional and no longer the default workflow. Only use this if you want a full local database stack for development experiments.

1. Ensure Docker Desktop is running.
2. Initialize the local database stack:

```powershell
npm.cmd run setup:local
```

3. Start the app with the local workflow:

```powershell
npm.cmd run dev:local
```

4. If Docker on Windows reports missing WSL support, run the prerequisites script as an administrator:

```powershell
npm.cmd run setup:docker-prereqs
```

### DBeaver Connection

Use these values to connect DBeaver to the local Supabase PostgreSQL instance:

```text
Host: 127.0.0.1
Port: 54322
Database: postgres
Username: postgres
Password: postgres
SSL: Disable
```

## Deployment

Deploy to any Node-compatible host that supports Next.js, such as Vercel, Netlify, or a managed Node server. Configure the same environment variables in the hosting dashboard. Supabase migrations should be applied before exposing the app to users.

## Security Considerations

- RLS is the source of truth for tenant isolation.
- Server route guards check permissions before protected pages render.
- Zod validates student and attendance writes.
- Destructive student actions are soft archival and require confirmation.
- Attendance duplicate prevention is enforced by a database unique constraint.
- Role changes are protected by administrator-only policies.
- User-provided content is rendered as text, not HTML.
- No secrets are committed; `.env.example` contains placeholders only.

## Common Troubleshooting

- If sign-in succeeds but redirects back to sign in, verify the Auth user has a matching `profiles` and active `school_members` row.
- If a teacher sees no classes, confirm `teacher_assignments` has rows for that teacher's Auth user ID.
- If student creation fails, check the current user role and the `students_insert_staff` RLS policy.
- If the app cannot connect to the database, confirm `.env.local` contains the correct Supabase URL and keys and that the project is active.
- If you are using the local Docker flow, make sure Docker is running before starting the app.
- If charts are empty, submit attendance records or add enrollments first.
- If PowerShell blocks `npm`, use `npm.cmd` as shown above.
- **"Could not find the table 'public.fee_structures'" or "public.student_fee_directory" errors**: The finance module migration has not been applied. Run `supabase/migrations/202607130001_finance_module.sql` in the Supabase Dashboard SQL Editor (or run `supabase db push` with the CLI) and restart the dev server.

## Remaining Operational Notes

The application does not create Auth users from the browser because that requires privileged Supabase Admin APIs. Create or invite users through Supabase Auth, then assign school membership in the database or an administrator-only server route backed by a secure server environment.
