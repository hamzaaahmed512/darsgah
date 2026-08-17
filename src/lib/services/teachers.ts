import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser, UserRole } from "@/types/database";
import { logActivity } from "@/lib/services/activity";
import { staffFormSchema, type StaffFormValues } from "@/lib/validation/staff";

const creatableRoles: Record<UserRole, UserRole[]> = {
  administrator: ["administrator", "principal", "teacher", "head_teacher", "staff", "student_staff", "cashier"],
  principal: ["teacher", "head_teacher", "staff", "student_staff", "cashier"],
  teacher: [],
  student_staff: [],
  cashier: [],
  staff: [],
  head_teacher: []
};

export async function createStaffAccount(user: AppUser, values: StaffFormValues) {
  const parsed = staffFormSchema.parse(values);
  const adminClient = createAdminClient();

  if (!(creatableRoles[user.role] ?? []).includes(parsed.role)) {
    throw new Error("You do not have permission to create that role.");
  }

  // 1. Create auth user via admin API
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Failed to create auth user");
  }

  // 2. Insert into profiles (will fail if trigger already did it, but let's do upsert or assume no trigger)
  // Our schema doesn't have an auth trigger according to what we saw, but wait, usually auth.users creates profiles?
  // Let's insert into profiles just in case. If it fails due to unique constraint, we can ignore or update.
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name: parsed.full_name,
      email: parsed.email,
      avatar_url: null,
      must_change_password: true,
    });

  if (profileError) throw new Error(profileError.message);

  // 3. Insert into school_members
  const { error: memberError } = await adminClient
    .from("school_members")
    .insert({
      school_id: user.schoolId,
      user_id: authData.user.id,
      role: parsed.role,
      department: parsed.department || null,
      job_title: parsed.job_title || null,
      status: "active"
    });

  if (memberError) throw new Error(memberError.message);

  if (parsed.salary != null) {
    const { error: salaryError } = await adminClient.from("teacher_employment_details").upsert({
      teacher_id: authData.user.id,
      school_id: user.schoolId,
      monthly_salary: parsed.salary,
      payment_method: "bank_transfer",
      employment_status: "active"
    });
    if (salaryError) throw new Error(salaryError.message);
  }

  await logActivity(user, "staff_created", "school_member", authData.user.id, { role: parsed.role });
}

export async function setStaffSalary(user: AppUser, staffId: string, salary: number) {
  if (user.role !== "administrator" && user.role !== "principal") throw new Error("Only administrators and principals can set salaries.");
  const parsedSalary = staffFormSchema.pick({ salary: true }).parse({ salary }).salary;
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_employment_details").upsert({
    teacher_id: staffId, school_id: user.schoolId, monthly_salary: parsedSalary,
    payment_method: "bank_transfer", employment_status: "active"
  });
  if (error) throw new Error(error.message);
  await logActivity(user, "staff_salary_updated", "school_member", staffId, { salary: parsedSalary });
}

export async function updateStaffStatus(user: AppUser, memberId: string, status: "active" | "disabled") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("school_members")
    .update({ status })
    .eq("school_id", user.schoolId)
    .eq("id", memberId);

  if (error) throw new Error(error.message);
  await logActivity(user, `staff_${status}`, "school_member", memberId);
}

export async function assignTeacherToClass(user: AppUser, teacherId: string, classId: string, subjectId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teacher_assignments").insert({
    school_id: user.schoolId,
    teacher_id: teacherId,
    class_id: classId,
    subject_id: subjectId || null
  });

  if (error) {
    if (error.code === '23505') throw new Error("Teacher is already assigned to this class.");
    throw new Error(error.message);
  }
  
  await logActivity(user, "teacher_assigned", "class", classId, { teacher_id: teacherId });
}

export async function unassignTeacherFromClass(user: AppUser, assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("school_id", user.schoolId)
    .eq("id", assignmentId);

  if (error) throw new Error(error.message);
}
