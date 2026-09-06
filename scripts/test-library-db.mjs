// Isolated PostgreSQL regression test. Pass a path to @electric-sql/pglite's dist/index.js.
// This creates an in-memory database and never connects to Supabase or production.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "@electric-sql/pglite");
const db = new PGlite();
let checks = 0;
const school = "11111111-1111-4111-8111-111111111111";
const otherSchool = "22222222-2222-4222-8222-222222222222";
const principal = "33333333-3333-4333-8333-333333333333";
const librarian = "44444444-4444-4444-8444-444444444444";
const outsider = "55555555-5555-4555-8555-555555555555";
const student = "66666666-6666-4666-8666-666666666666";
const secondStudent = "77777777-7777-4777-8777-777777777777";
const foreignStudent = "88888888-8888-4888-8888-888888888888";
const sql = path => readFileSync(new URL(`../supabase/migrations/${path}`, import.meta.url), "utf8");
try {
  await db.exec(`
    create schema auth; create schema app;
    create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create type public.app_role as enum ('principal','administrator','teacher','staff','cashier','student_staff','head_teacher');
    create table public.schools(id uuid primary key);
    create table public.profiles(id uuid primary key,full_name text);
    create table public.school_members(id uuid default gen_random_uuid(),school_id uuid,user_id uuid,role public.app_role,status text,custom_role_id uuid,unique(school_id,user_id));
    create table public.students(id uuid primary key,school_id uuid,first_name text,last_name text,admission_number text,status text);
    create table public.role_permissions(school_id uuid,role_key text,permission text,granted boolean,unique(school_id,role_key,permission));
    create table public.user_permission_overrides(school_id uuid,user_id uuid,permission text,granted boolean);
  `);
  const permissions = sql("202607150002_custom_roles_and_profile_improvements.sql");
  await db.exec(permissions.slice(permissions.indexOf("create or replace function app.get_resolved_permissions"), permissions.indexOf("-- 12. Function")));
  const workflows = sql("202607160001_school_os_workflows.sql");
  await db.exec(workflows.slice(workflows.indexOf("create or replace function app.has_school_role_key"), workflows.indexOf("do $$")));
  // Existing schools exercise the backfill; the second school exercises the new-school trigger.
  await db.query("insert into schools values($1)", [school]);
  await db.exec(sql("202609060001_librarian_role.sql"));
  await db.exec(sql("202609060002_library.sql"));
  await db.query("insert into schools values($1)", [otherSchool]);
  for (const [id, name, sid, role] of [[principal, "Principal", school, "principal"], [librarian, "Librarian", school, "librarian"], [outsider, "Outsider", otherSchool, "librarian"]]) {
    await db.query("insert into profiles values($1,$2)", [id, name]);
    await db.query("insert into school_members(school_id,user_id,role,status) values($1,$2,$3,'active')", [sid, id, role]);
  }
  for (const [id, sid, name] of [[student, school, "Student One"], [secondStudent, school, "Student Two"], [foreignStudent, otherSchool, "Other Student"]]) {
    await db.query("insert into students values($1,$2,$3,'Test',$3,'active')", [id, sid, name]);
  }
  async function actor(id) { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); }
  async function mutate(action, data, sid = school) { await db.query("select library_mutate($1,$2,$3::jsonb)", [sid, action, JSON.stringify(data)]); }
  async function expectError(fn, pattern) { await assert.rejects(fn, pattern); checks++; }
  async function value(query, params = []) { return (await db.query(query, params)).rows[0]; }
  await actor(librarian);
  assert.equal((await value("select library_allowed($1,'library:manage') as allowed", [school])).allowed, true); checks++;
  await mutate("book", { title: "Test Book", author: "Author", isbn: "9780000000000", category: "Science", publisher: "Publisher", shelf: "A1" });
  const book = (await value("select id from library_books")).id;
  await mutate("copy", { book_id: book, accession: "lib-001", replacement_cost: 500 });
  const copy = (await value("select id from library_copies")).id;
  await expectError(() => mutate("copy", { book_id: book, accession: "LIB-001", replacement_cost: 10 }), /unique|duplicate/i);
  await expectError(() => mutate("settings", { loan_days: 14, max_loans: 3, max_renewals: 2, fine_per_day: 10 }), /Only the principal/i);
  await actor(principal);
  await mutate("settings", { loan_days: 14, max_loans: 1, max_renewals: 1, fine_per_day: 10 });
  await actor(librarian);
  const due = (await value("select to_char((now() at time zone 'Asia/Karachi')::date+14,'YYYY-MM-DD') as due")).due;
  const borrower = { borrower_kind: "student", borrower_id: student };
  await expectError(() => mutate("issue", { copy_id: copy, borrower_kind: "student", borrower_id: foreignStudent, due_date: due }), /active borrower/i);
  await mutate("issue", { copy_id: copy, ...borrower, due_date: due });
  const loan = (await value("select id from library_loans")).id;
  await expectError(() => mutate("issue", { copy_id: copy, ...borrower, due_date: due }), /no longer available/i);
  await expectError(() => mutate("copy_status", { id: copy, status: "available" }), /close its loan/i);
  await expectError(() => mutate("archive", { id: book, archived: true }), /open loans/i);
  await mutate("copy", { book_id: book, accession: "LIB-002", replacement_cost: 100 });
  const copy2 = (await value("select id from library_copies where accession='LIB-002'")).id;
  await expectError(() => mutate("issue", { copy_id: copy2, ...borrower, due_date: due }), /loan limit/i);
  await mutate("reserve", { book_id: book, borrower_kind: "student", borrower_id: secondStudent });
  await expectError(() => mutate("renew", { id: loan }), /reservation/i);
  await expectError(() => mutate("issue", { copy_id: copy2, borrower_kind: "staff", borrower_id: librarian, due_date: due }), /front of the queue/i);
  const reservation = (await value("select id from library_reservations")).id;
  await mutate("cancel_reservation", { id: reservation });
  await mutate("renew", { id: loan });
  await expectError(() => mutate("renew", { id: loan }), /renewal limit/i);
  await db.query("update library_loans set due_date=(now() at time zone 'Asia/Karachi')::date-3 where id=$1", [loan]);
  await mutate("return", { id: loan, outcome: "lost" });
  assert.equal(Number((await value("select fine_amount from library_loans where id=$1", [loan])).fine_amount), 530); checks++;
  await expectError(() => mutate("return", { id: loan, outcome: "returned" }), /already been closed/i);
  await mutate("payment", { id: loan, amount: 100 });
  await expectError(() => mutate("payment", { id: loan, amount: 500 }), /within the closed loan balance/i);
  await expectError(() => mutate("waive", { id: loan, amount: 50, reason: "Approved" }), /Only the principal/i);
  await actor(principal);
  await mutate("waive", { id: loan, amount: 430, reason: "Principal approval" });
  assert.equal(Number((await value("select fine_amount-paid_amount-waived_amount as balance from library_loans where id=$1", [loan])).balance), 0); checks++;
  await actor(librarian);
  await mutate("reserve", { book_id: book, borrower_kind: "student", borrower_id: secondStudent });
  await mutate("issue", { copy_id: copy2, borrower_kind: "student", borrower_id: secondStudent, due_date: due });
  assert.equal((await value("select count(*)::int as n from library_reservations where status='waiting'")).n, 0); checks++;
  const loan2 = (await value("select id from library_loans where copy_id=$1", [copy2])).id;
  await mutate("return", { id: loan2, outcome: "damaged" });
  assert.equal((await value("select status from library_copies where id=$1", [copy2])).status, "damaged"); checks++;
  await mutate("copy_status", { id: copy2, status: "available" });
  await actor(outsider);
  await expectError(() => mutate("edit_book", { id: book, title: "Attack", author: "Attack", isbn: "", category: "", publisher: "", shelf: "" }), /access denied/i);
  await expectError(() => mutate("copy", { book_id: book, accession: "X", replacement_cost: 0 }, otherSchool), /active title/i);
  await expectError(() => db.query("select * from library_borrowers($1)", [school]), /access denied/i);
  await db.exec("set role authenticated");
  assert.equal((await value("select count(*)::int as n from library_books")).n, 0); checks++;
  await expectError(() => db.query("insert into library_books(school_id,title,author) values($1,'Attack','Attack')", [otherSchool]), /permission denied/i);
  await db.exec("reset role");
  await actor(librarian);
  await db.query("insert into user_permission_overrides values($1,$2,'library:manage',false)", [school, librarian]);
  await expectError(() => mutate("copy_status", { id: copy2, status: "available" }), /access denied/i);
  assert.equal((await value("select library_allowed($1,'library:view') as allowed", [school])).allowed, true); checks++;
  await db.query("update school_members set status='disabled' where user_id=$1", [librarian]);
  await expectError(() => db.query("select * from library_borrowers($1)", [school]), /access denied/i);
  console.log(`Library PostgreSQL integration: ${checks} checks passed.`);
} finally { await db.close(); }
