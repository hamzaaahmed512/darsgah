import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCnic } from "@/lib/pakistan-format";

const SESSION_COOKIE = "parent_portal_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export type ParentPortalSession = { studentId: string; schoolId: string; expiresAt: number };

type StudentPortalLoginRow = { id: string; school_id: string; student_cnic: string | null; date_of_birth: string | null };

function sessionSecret() {
  const secret = process.env.PARENT_PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("PARENT_PORTAL_SESSION_SECRET is not configured.");
  return secret;
}

function normalizeCnic(value: string) { return value.replace(/\D/g, ""); }
function sign(value: string) { return createHmac("sha256", sessionSecret()).update(value).digest("base64url"); }

function encodeSession(session: ParentPortalSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): ParentPortalSession | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ParentPortalSession;
    return session.studentId && session.schoolId && session.expiresAt > Math.floor(Date.now() / 1000) ? session : null;
  } catch { return null; }
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

function dateOfBirthPassword(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export async function authenticateParent(studentCnic: string, dateOfBirth: string) {
  const normalizedCnic = normalizeCnic(studentCnic);
  const normalizedDateOfBirth = dateOfBirthPassword(dateOfBirth);
  if (normalizedCnic.length !== 13 || !normalizedDateOfBirth) return { error: "Enter a valid student CNIC and date of birth." };

  const rateKey = normalizedCnic;
  if (!checkRateLimit(rateKey)) return { error: "Too many attempts. Try again in a few minutes." };

  const admin = createAdminClient();
  const cnicVariants = [...new Set([studentCnic.trim(), formatCnic(normalizedCnic), normalizedCnic])];
  const { data: students, error } = await admin.from("students").select("id,school_id,student_cnic,date_of_birth").eq("status", "active").in("student_cnic", cnicVariants);
  if (error) return { error: "Unable to sign in right now." };
  const student = (students as StudentPortalLoginRow[] | null)?.find((row) => normalizeCnic(row.student_cnic ?? "") === normalizedCnic && row.date_of_birth === normalizedDateOfBirth);
  if (!student) return { error: "The student CNIC or date of birth is incorrect." };

  const session: ParentPortalSession = { studentId: student.id, schoolId: student.school_id, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(session), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_SECONDS });
  attempts.delete(rateKey);
  return { destination: "/parent-portal" };
}

export async function getParentPortalSession() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? decodeSession(value) : null;
}

export async function signOutParent() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getParentChildren(session: ParentPortalSession) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("student_directory").select("id,first_name,last_name,name_en,admission_number,grade_name,section_name,class_name,photo_url,status").eq("school_id", session.schoolId).eq("id", session.studentId).neq("status", "archived").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? [data] : [];
}

export async function getParentStudent(session: ParentPortalSession, studentId: string) {
  if (studentId !== session.studentId) return null;
  const admin = createAdminClient();
  const [student, guardians, attendance, marks, challans, school, schoolSettings] = await Promise.all([
    admin.from("student_directory").select("id,first_name,last_name,name_en,admission_number,student_cnic,status,class_id,class_name,grade_name,section_name,guardian_name,attendance_rate,date_of_birth,gender,father_name_en,father_phone,photo_url,email,phone,address,admission_date").eq("school_id", session.schoolId).eq("id", studentId).maybeSingle(),
    admin.from("student_guardian_details").select("student_id,guardian_id,is_primary,full_name,relationship,email,phone,cnic").eq("school_id", session.schoolId).eq("student_id", studentId).order("is_primary", { ascending: false }),
    admin.from("attendance_records").select("id,attendance_date,status,note,classes(name,grades(name),sections(name))").eq("school_id", session.schoolId).eq("student_id", studentId).order("attendance_date", { ascending: false }),
    admin.from("marks").select("id,marks_obtained,grade,status,teacher_comment,exams(title,term,exam_type,exam_date,max_marks,approval_status),subjects(name)").eq("school_id", session.schoolId).eq("student_id", studentId).order("created_at", { ascending: false }),
    admin.from("fee_challans").select("id,fee_month,amount,due_date,created_at,student_fee_accounts(total_payable,fee_payments(amount,payment_date,is_voided))").eq("school_id", session.schoolId).eq("student_id", studentId).order("fee_month", { ascending: false }),
    admin.from("schools").select("name,contact_email").eq("id", session.schoolId).maybeSingle(),
    admin.from("school_settings").select("settings").eq("school_id", session.schoolId).maybeSingle()
  ]);
  if (student.error || guardians.error || attendance.error || marks.error || challans.error || school.error || schoolSettings.error) throw new Error("Unable to load the student profile.");
  const settings = (schoolSettings.data?.settings ?? {}) as Record<string, unknown>;
  const schoolInfo = school.data ? { name: school.data.name, contactEmail: school.data.contact_email, phone: typeof settings.schoolPhone === "string" ? settings.schoolPhone : null } : null;
  const portalChallans = (challans.data ?? []).map((row: any) => {
    const paidForMonth = (row.student_fee_accounts?.fee_payments ?? [])
      .filter((payment: any) => !payment.is_voided && String(payment.payment_date ?? "").startsWith(String(row.fee_month).slice(0, 7)))
      .reduce((total: number, payment: any) => total + Number(payment.amount ?? 0), 0);
    const amount = Number(row.amount ?? row.student_fee_accounts?.total_payable ?? 0);
    const outstanding = Math.max(0, amount - paidForMonth);
    const overdue = outstanding > 0 && row.due_date && new Date(`${row.due_date}T23:59:59`).getTime() < Date.now();
    return { ...row, amount, outstanding, payment_status: outstanding <= 0 ? "paid" : paidForMonth > 0 ? "partial" : overdue ? "overdue" : "unpaid" };
  });
  return { student: student.data, school: schoolInfo, guardians: guardians.data ?? [], attendance: attendance.data ?? [], marks: marks.data ?? [], challans: portalChallans, summaries: { attendance: { total: attendance.data?.length ?? 0, present: attendance.data?.filter((row: any) => ["present", "late"].includes(row.status)).length ?? 0, rate: attendance.data?.length ? ((attendance.data.filter((row: any) => ["present", "late"].includes(row.status)).length / attendance.data.length) * 100) : null }, exams: { total: marks.data?.length ?? 0, average: null }, fees: { total: portalChallans.reduce((total, row) => total + row.amount, 0), outstanding: portalChallans.reduce((total, row) => total + row.outstanding, 0) } } };
}
