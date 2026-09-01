import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser, UserRole } from "@/types/database";
import { logActivity } from "@/lib/services/activity";
import { staffFormSchema, type StaffFormValues } from "@/lib/validation/staff";

export const STAFF_EMAIL_ALREADY_ASSIGNED_MESSAGE = "This email address is already assigned to this school.";

export class StaffEmailAlreadyAssignedError extends Error {
  field = "email" as const;

  constructor() {
    super(STAFF_EMAIL_ALREADY_ASSIGNED_MESSAGE);
    this.name = "StaffEmailAlreadyAssignedError";
  }
}

const creatableRoles: Record<UserRole, UserRole[]> = {
  administrator: ["teacher", "staff", "student_staff", "cashier"],
  principal: ["administrator", "teacher", "staff", "student_staff", "cashier"],
  teacher: [],
  student_staff: [],
  cashier: [],
  staff: [],
  head_teacher: []
};

function isDuplicateEmailError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: string;
    status?: number;
    message?: string;
    meta?: { target?: string[] | string };
    details?: string;
    constraint?: string;
  };
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""} ${candidate.constraint ?? ""}`.toLowerCase();
  const target = Array.isArray(candidate.meta?.target) ? candidate.meta.target.join(" ") : candidate.meta?.target ?? "";
  const targetMentionsEmail = target.toLowerCase().includes("email") || message.includes("email");
  const authDuplicateEmail =
    candidate.code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists");

  if (candidate.code === "P2002") return targetMentionsEmail;
  if (candidate.code === "23505") return targetMentionsEmail;

  return (candidate.status === 400 || candidate.status === 422) && authDuplicateEmail;
}

export async function createStaffAccount(user: AppUser, values: StaffFormValues) {
  const parsed = staffFormSchema.parse(values);
  const adminClient = createAdminClient();
  const customRole = parsed.custom_role_id
    ? await adminClient
        .from("custom_roles")
        .select("id,name,base_role")
        .eq("school_id", user.schoolId)
        .eq("id", parsed.custom_role_id)
        .maybeSingle<{ id: string; name: string; base_role: UserRole }>()
    : { data: null, error: null };
  if (customRole.error) throw new Error(customRole.error.message);
  if (parsed.custom_role_id && !customRole.data) throw new Error("Selected custom role could not be found.");

  const effectiveRole = customRole.data?.base_role ?? parsed.role;
  if (effectiveRole === "principal") {
    throw new Error("Principal accounts cannot be created from this screen. Each school can have only one principal.");
  }

  if (!(creatableRoles[user.role] ?? []).includes(effectiveRole)) {
    throw new Error("You do not have permission to create that role.");
  }

  const normalizedEmail = parsed.email.trim().toLowerCase();

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle<{ id: string; full_name: string | null }>();

  if (existingProfileError) throw new Error(existingProfileError.message);
  if (existingProfile) {
    const { data: existingMembership, error: existingMembershipError } = await adminClient
      .from("school_members")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("user_id", existingProfile.id)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingMembershipError) throw new Error(existingMembershipError.message);
    if (existingMembership) throw new StaffEmailAlreadyAssignedError();
  }

  let userId = existingProfile?.id ?? null;

  if (!userId) {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      if (isDuplicateEmailError(authError)) {
        const { data: altProfile } = await adminClient
          .from("profiles")
          .select("id")
          .ilike("email", normalizedEmail)
          .limit(1)
          .maybeSingle<{ id: string }>();

        if (altProfile) {
          const { data: altMembership } = await adminClient
            .from("school_members")
            .select("id")
            .eq("school_id", user.schoolId)
            .eq("user_id", altProfile.id)
            .limit(1)
            .maybeSingle<{ id: string }>();

          if (altMembership) throw new StaffEmailAlreadyAssignedError();
          userId = altProfile.id;
        } else {
          throw new StaffEmailAlreadyAssignedError();
        }
      } else {
        throw new Error(authError?.message || "Failed to create auth user");
      }
    } else {
      userId = authData.user.id;
    }

    if (userId && !existingProfile) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: userId,
          full_name: parsed.full_name,
          email: normalizedEmail,
          avatar_url: null,
          must_change_password: true,
        });

      if (profileError && isDuplicateEmailError(profileError)) {
        const { data: existingMembership } = await adminClient
          .from("school_members")
          .select("id")
          .eq("school_id", user.schoolId)
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle<{ id: string }>();
        if (existingMembership) throw new StaffEmailAlreadyAssignedError();
      } else if (profileError) {
        throw new Error(profileError.message);
      }
    }
  }

  const { error: memberError } = await adminClient
    .from("school_members")
    .insert({
      school_id: user.schoolId,
      user_id: userId,
      role: effectiveRole,
      custom_role_id: customRole.data?.id ?? null,
      department: parsed.department || null,
      job_title: parsed.job_title || null,
      status: "active"
    });

  if (memberError) {
    if (memberError.code === "23505") throw new StaffEmailAlreadyAssignedError();
    throw new Error(memberError.message);
  }

  if (parsed.salary != null) {
    const { error: salaryError } = await adminClient.from("teacher_employment_details").upsert({
      teacher_id: userId,
      school_id: user.schoolId,
      monthly_salary: parsed.salary,
      payment_method: "bank_transfer",
      employment_status: "active"
    });
    if (salaryError) throw new Error(salaryError.message);
  }

  await logActivity(user, "staff_created", "school_member", userId, {
    role: effectiveRole,
    custom_role_id: customRole.data?.id ?? null,
    reused_identity: Boolean(existingProfile)
  });
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
