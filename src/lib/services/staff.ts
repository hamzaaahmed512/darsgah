import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/database";
import { formatPakistaniPhoneForStorage } from "@/lib/pakistan-format";
import { logActivity } from "@/lib/services/activity";
import { OTHER_STAFF_CATEGORIES, OTHER_STAFF_CATEGORY_LABELS, type OtherStaffCategory } from "@/lib/constants/staff";
import { formatDisplayName } from "@/lib/student-name";

function isMissingOtherStaffTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.message?.includes("public.other_staff_records");
}

function canManageOtherStaff(user: AppUser) {
  return user.role === "administrator" || user.role === "principal";
}

export async function getStaff(user: AppUser, role = "all", q = "") {
  const supabase = await createClient();
  let accountRows: any[] = [];

  if (role !== "other") {
    let accountQuery = supabase
      .from("staff_directory")
      .select("*")
      .eq("school_id", user.schoolId)
      .order("full_name");

    if (role !== "all") accountQuery = accountQuery.eq("role", role);
    if (q) accountQuery = accountQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`);

    const { data, error } = await accountQuery;
    if (error) throw new Error(error.message);
    accountRows = (data ?? []).map((row: any) => ({ ...row, full_name: formatDisplayName(row.full_name) }));
  }

  let otherRows: any[] = [];
  if (role === "all" || role === "other") {
    let otherQuery = supabase
      .from("other_staff_records")
      .select("*")
      .eq("school_id", user.schoolId)
      .order("full_name");
    if (q) otherQuery = otherQuery.or(`full_name.ilike.%${q}%,department.ilike.%${q}%,job_title.ilike.%${q}%`);
    const { data: others, error: otherError } = await otherQuery;
    if (isMissingOtherStaffTable(otherError)) otherRows = [];
    else if (otherError) throw new Error(otherError.message);
    else otherRows = (others ?? []).map((row: any) => ({
      member_id: row.id,
      user_id: null,
      full_name: formatDisplayName(row.full_name),
      email: null,
      avatar_url: null,
      role: "other",
      other_category: row.category,
      status: row.status,
      department: row.department,
      job_title: row.job_title,
      phone: row.phone,
      personal_email: null,
      must_change_password: false,
      assigned_classes: 0,
      monthly_salary: row.monthly_salary,
      is_record_only: true
    }));
  }

  return [...accountRows, ...otherRows];
}

export async function getStaffProfile(user: AppUser, staffId: string) {
  const supabase = await createClient();
  const [{ data: member, error: memberError }, assignments, headClasses, employment] = await Promise.all([
    supabase.from("staff_directory").select("*").eq("school_id", user.schoolId).eq("user_id", staffId).maybeSingle(),
    supabase.from("teacher_assignments").select("id,classes(id,name,room,grades(name),sections(name)),subjects(name)").eq("school_id", user.schoolId).eq("teacher_id", staffId),
    supabase.from("classes").select("id,name,room,grades(name),sections(name)").eq("school_id", user.schoolId).eq("head_teacher_id", staffId),
    supabase.from("teacher_employment_details").select("*").eq("school_id", user.schoolId).eq("teacher_id", staffId).maybeSingle()
  ]);
  if (memberError) throw new Error(memberError.message);
  if (assignments.error) throw new Error(assignments.error.message);
  if (headClasses.error) throw new Error(headClasses.error.message);
  if (employment.error && employment.error.code !== "PGRST116") throw new Error(employment.error.message);
  return {
    member: member ? { ...member, full_name: formatDisplayName(member.full_name) } : member,
    assignments: assignments.data ?? [],
    headClasses: headClasses.data ?? [],
    employment: employment.data ?? null
  };
}

export async function createOtherStaffRecord(user: AppUser, values: {
  fullName: string;
  category: OtherStaffCategory;
  department?: string;
  jobTitle?: string;
  phone?: string;
  monthlySalary?: number | null;
}) {
  if (!canManageOtherStaff(user)) throw new Error("Only administrators and principals can add other staff records.");
  const fullName = values.fullName.trim();
  if (!fullName) throw new Error("Full name is required.");
  const category = OTHER_STAFF_CATEGORIES.includes(values.category) ? values.category : "other";
  const phone = formatPakistaniPhoneForStorage(values.phone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("other_staff_records")
    .insert({
      school_id: user.schoolId,
      full_name: fullName,
      category,
      department: values.department?.trim() || "Others",
      job_title: values.jobTitle?.trim() || OTHER_STAFF_CATEGORY_LABELS[category],
      phone,
      monthly_salary: values.monthlySalary ?? null,
      status: "active"
    })
    .select("id")
    .single();
  if (isMissingOtherStaffTable(error)) throw new Error("Apply the latest database migration to add record-only staff.");
  if (error) throw new Error(error.message);
  await logActivity(user, "other_staff_created", "other_staff", data.id, { category });
}

export async function setOtherStaffSalary(user: AppUser, staffId: string, salary: number) {
  if (!canManageOtherStaff(user)) throw new Error("Only administrators and principals can set salaries.");
  if (!Number.isFinite(salary) || salary < 0) throw new Error("Salary must be zero or greater.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("other_staff_records")
    .update({ monthly_salary: salary })
    .eq("school_id", user.schoolId)
    .eq("id", staffId);
  if (isMissingOtherStaffTable(error)) throw new Error("Apply the latest database migration to add record-only staff.");
  if (error) throw new Error(error.message);
  await logActivity(user, "other_staff_salary_updated", "other_staff", staffId, { salary });
}
