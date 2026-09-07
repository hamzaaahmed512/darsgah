import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCnic, normalizedPakistaniPhone } from "@/lib/pakistan-format";

const SESSION_COOKIE = "parent_portal_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export type ParentPortalSession = { guardianId: string; schoolId: string; expiresAt: number };

type GuardianRow = { id: string; school_id: string; full_name: string; phone: string; cnic: string | null };

function sessionSecret() {
  const secret = process.env.PARENT_PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("PARENT_PORTAL_SESSION_SECRET is not configured.");
  return secret;
}

function normalizeCnic(value: string) { return value.replace(/\D/g, ""); }
function normalizePhone(value: string) { return normalizedPakistaniPhone(value); }
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
    return session.expiresAt > Math.floor(Date.now() / 1000) ? session : null;
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

export async function authenticateParent(schoolSlug: string, cnic: string, phone: string) {
  const normalizedCnic = normalizeCnic(cnic);
  const normalizedPhone = normalizePhone(phone);
  if (normalizedCnic.length !== 13 || !/^03\d{9}$/.test(normalizedPhone)) return { error: "Enter a valid CNIC and phone number." };

  const rateKey = `${schoolSlug.trim().toLowerCase()}:${normalizedCnic}`;
  if (!checkRateLimit(rateKey)) return { error: "Too many attempts. Try again in a few minutes." };

  const admin = createAdminClient();
  const { data: school, error: schoolError } = await admin.from("schools").select("id").eq("slug", schoolSlug.trim().toLowerCase()).maybeSingle<{ id: string }>();
  if (schoolError || !school) return { error: "School portal not found." };

  const cnicVariants = [...new Set([cnic.trim(), formatCnic(normalizedCnic), normalizedCnic])];
  const { data: guardians, error } = await admin.from("guardians").select("id,school_id,full_name,phone,cnic").eq("school_id", school.id).in("cnic", cnicVariants);
  if (error) return { error: "Unable to sign in right now." };
  const guardian = (guardians as GuardianRow[] | null)?.find((row) => normalizeCnic(row.cnic ?? "") === normalizedCnic && normalizePhone(row.phone) === normalizedPhone);
  if (!guardian) return { error: "The CNIC or phone number is incorrect." };

  const session: ParentPortalSession = { guardianId: guardian.id, schoolId: school.id, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
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
  const { data: links, error: linksError } = await admin.from("student_guardians").select("student_id").eq("school_id", session.schoolId).eq("guardian_id", session.guardianId);
  if (linksError) throw new Error(linksError.message);
  const ids = (links ?? []).map((row) => row.student_id);
  if (!ids.length) return [];
  const { data, error } = await admin.from("student_directory").select("id,first_name,last_name,name_en,admission_number,grade_name,section_name,class_name,photo_url,status").eq("school_id", session.schoolId).in("id", ids).neq("status", "archived").order("last_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getParentStudent(session: ParentPortalSession, studentId: string) {
  const children = await getParentChildren(session);
  if (!children.some((child) => child.id === studentId)) return null;
  const admin = createAdminClient();
  const [student, guardians, attendance, marks] = await Promise.all([
    admin.from("student_directory").select("id,first_name,last_name,name_en,admission_number,status,class_id,class_name,grade_name,section_name,guardian_name,attendance_rate,date_of_birth,gender,father_name_en,father_phone,photo_url,email,phone,address,admission_date").eq("school_id", session.schoolId).eq("id", studentId).maybeSingle(),
    admin.from("student_guardian_details").select("student_id,guardian_id,is_primary,full_name,relationship,email,phone,cnic").eq("school_id", session.schoolId).eq("student_id", studentId).order("is_primary", { ascending: false }),
    admin.from("attendance_records").select("id,attendance_date,status,note,classes(name,grades(name),sections(name))").eq("school_id", session.schoolId).eq("student_id", studentId).order("attendance_date", { ascending: false }),
    admin.from("marks").select("id,marks_obtained,grade,status,teacher_comment,exams(title,term,exam_type,exam_date,max_marks,approval_status),subjects(name)").eq("school_id", session.schoolId).eq("student_id", studentId).order("created_at", { ascending: false })
  ]);
  if (student.error || guardians.error || attendance.error || marks.error) throw new Error("Unable to load the student profile.");
  return { student: student.data, guardians: guardians.data ?? [], attendance: attendance.data ?? [], marks: marks.data ?? [], challans: [], summaries: { attendance: { total: attendance.data?.length ?? 0, present: attendance.data?.filter((row: any) => ["present", "late"].includes(row.status)).length ?? 0, rate: attendance.data?.length ? ((attendance.data.filter((row: any) => ["present", "late"].includes(row.status)).length / attendance.data.length) * 100) : null }, exams: { total: marks.data?.length ?? 0, average: null }, fees: { total: 0, outstanding: 0 } } };
}