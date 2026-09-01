import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { sortClassesNaturally } from "@/lib/class-sort";
import { formatDisplayName } from "@/lib/student-name";

const ADMIN_RESTRICTED_MEMBER_ROLES = new Set(["principal", "administrator"]);
const PRINCIPAL_ONLY_ROLE_TARGETS = new Set(["principal", "administrator"]);

function isOutdatedHeadTeacherGuard(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("Head teacher must be an active teacher in this school."));
}

async function getSchoolMemberRecord(user: AppUser, memberId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("school_members")
    .select("id,user_id,role")
    .eq("school_id", user.schoolId)
    .eq("id", memberId)
    .maybeSingle<{ id: string; user_id: string; role: string }>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("School member not found.");
  return data;
}

function assertCanManageProtectedMember(
  user: AppUser,
  target: { user_id: string; role: string },
  requestedRole?: string
) {
  if (requestedRole === "principal") {
    throw new Error("Principal role changes are not supported here. Each school can have only one principal.");
  }

  if (user.role !== "administrator") return;

  if (
    target.user_id === user.id ||
    ADMIN_RESTRICTED_MEMBER_ROLES.has(target.role) ||
    (requestedRole != null && PRINCIPAL_ONLY_ROLE_TARGETS.has(requestedRole))
  ) {
    throw new Error("Only the principal can manage administrator and principal accounts.");
  }
}

async function loadSchoolProfile(user: AppUser) {
  const adminClient = createAdminClient();

  const [schoolRes, settingsRes] = await Promise.all([
    adminClient.from("schools").select("*").eq("id", user.schoolId).maybeSingle(),
    adminClient.from("school_settings").select("*").eq("school_id", user.schoolId).maybeSingle()
  ]);

  if (schoolRes.error) throw new Error(schoolRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  return {
    school: schoolRes.data,
    settings: settingsRes.data?.settings ?? {}
  };
}

export async function getSchoolProfile(user: AppUser) {
  return loadSchoolProfile(user);
}

export async function getSchoolSettings(user: AppUser) {
  if (!hasPermission(user.role, "settings:manage", user.permissions)) {
    throw new Error("Unauthorized to access school settings");
  }
  return loadSchoolProfile(user);
}

export async function getPrincipalTeachingSettings(user: AppUser) {
  if (user.role !== "principal" && user.role !== "administrator") {
    return { classes: [], assignedClassId: null };
  }

  const supabase = await createClient();
  const [classesResult, assignmentResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id,name,head_teacher_id,grades(name),sections(name),academic_years(name)")
      .eq("school_id", user.schoolId)
      .order("name"),
    supabase
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("head_teacher_id", user.id)
      .limit(1)
      .maybeSingle()
  ]);

  if (classesResult.error) throw new Error(classesResult.error.message);
  if (assignmentResult.error) throw new Error(assignmentResult.error.message);

  return {
    assignedClassId: assignmentResult.data?.id ?? null,
    classes: sortClassesNaturally(classesResult.data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      grade_name: row.grades?.name ?? "Grade",
      section_name: row.sections?.name ?? null,
      academic_year_name: row.academic_years?.name ?? "Academic year",
      assigned_to_principal: row.head_teacher_id === user.id,
      has_other_head_teacher: Boolean(row.head_teacher_id && row.head_teacher_id !== user.id)
    }))
  };
}

export async function updatePrincipalTeachingAssignment(user: AppUser, classId: string | null) {
  if (user.role !== "principal") {
    throw new Error("Only principals can manage their teaching assignment.");
  }

  const adminClient = createAdminClient();

  if (classId) {
    const { data: targetClass, error: targetError } = await adminClient
      .from("classes")
      .select("id")
      .eq("school_id", user.schoolId)
      .eq("id", classId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);
    if (!targetClass) throw new Error("Class not found.");
  }

  const { error: clearError } = await adminClient
    .from("classes")
    .update({ head_teacher_id: null })
    .eq("school_id", user.schoolId)
    .eq("head_teacher_id", user.id);

  if (isOutdatedHeadTeacherGuard(clearError)) {
    throw new Error("Apply the latest database migration so principals can be assigned as class head teachers.");
  }
  if (clearError) throw new Error(clearError.message);

  if (!classId) return;

  const { error } = await adminClient
    .from("classes")
    .update({ head_teacher_id: user.id })
    .eq("school_id", user.schoolId)
    .eq("id", classId);

  if (isOutdatedHeadTeacherGuard(error)) {
    throw new Error("Apply the latest database migration so principals can be assigned as class head teachers.");
  }
  if (error) throw new Error(error.message);
}

export async function updateSchoolSettings(
  user: AppUser,
  name: string,
  timezone: string,
  settings: Record<string, any>
) {
  if (!hasPermission(user.role, "settings:manage", user.permissions)) {
    throw new Error("Unauthorized to manage school settings");
  }
  const adminClient = createAdminClient();

  const { data: currentSettingsRow, error: currentSettingsError } = await adminClient
    .from("school_settings")
    .select("settings")
    .eq("school_id", user.schoolId)
    .maybeSingle();

  if (currentSettingsError) throw new Error(currentSettingsError.message);

  const mergedSettings = {
    ...(currentSettingsRow?.settings ?? {}),
    ...settings
  };

  const { error: schoolError } = await adminClient
    .from("schools")
    .update({ name: name.trim(), timezone })
    .eq("id", user.schoolId);

  if (schoolError) throw new Error(schoolError.message);

  const { error: settingsError } = await adminClient
    .from("school_settings")
    .upsert({
      school_id: user.schoolId,
      settings: mergedSettings
    });

  if (settingsError) throw new Error(settingsError.message);
}

// ─── Academic Years CRUD ────────────────────────────────────────────────────────

export async function getAcademicYears(user: AppUser) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", user.schoolId)
    .order("starts_on", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAcademicYear(
  user: AppUser,
  values: { name: string; starts_on: string; ends_on: string; is_active: boolean }
) {
  if (!hasPermission(user.role, "settings:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();

  // If is_active is true, set all other academic years to is_active = false
  if (values.is_active) {
    const { error: resetError } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .eq("school_id", user.schoolId);
    if (resetError) throw new Error(resetError.message);
  }

  const { error } = await supabase.from("academic_years").insert({
    school_id: user.schoolId,
    name: values.name,
    starts_on: values.starts_on,
    ends_on: values.ends_on,
    is_active: values.is_active
  });

  if (error) throw new Error(error.message);
}

export async function updateAcademicYear(
  user: AppUser,
  id: string,
  values: { name: string; starts_on: string; ends_on: string; is_active: boolean }
) {
  if (!hasPermission(user.role, "settings:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();

  if (values.is_active) {
    const { error: resetError } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .eq("school_id", user.schoolId);
    if (resetError) throw new Error(resetError.message);
  }

  const { error } = await supabase
    .from("academic_years")
    .update({
      name: values.name,
      starts_on: values.starts_on,
      ends_on: values.ends_on,
      is_active: values.is_active
    })
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);
}

export async function deleteAcademicYear(user: AppUser, id: string) {
  if (!hasPermission(user.role, "settings:manage")) throw new Error("Unauthorized");
  const supabase = await createClient();

  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);
}

// ─── School Members / Roles CRUD ───────────────────────────────────────────────

export async function getSchoolMembers(user: AppUser) {
  if (!hasPermission(user.role, "users:manage")) {
    throw new Error("Unauthorized to access member details");
  }
  const supabase = await createClient();

  let query = supabase
    .from("school_members")
    .select(`
      id,
      user_id,
      role,
      status,
      department,
      job_title,
      custom_role_id,
      profiles!school_members_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq("school_id", user.schoolId);

  if (user.role === "administrator") {
    query = query.not("role", "in", "(principal,administrator)");
  }

  const { data, error } = await query.order("role");

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    memberId: row.id,
    userId: row.user_id ?? row.profiles?.id,
    fullName: formatDisplayName(row.profiles?.full_name) || "—",
    email: row.profiles?.email ?? "—",
    avatarUrl: row.profiles?.avatar_url,
    role: row.role,
    customRoleId: row.custom_role_id ?? null,
    status: row.status,
    department: row.department,
    jobTitle: row.job_title
  }));
}

export async function updateMemberRole(user: AppUser, memberId: string, newRole: string) {
  if (!hasPermission(user.role, "users:manage")) {
    throw new Error("Unauthorized to modify user roles");
  }
  const adminClient = createAdminClient();
  const target = await getSchoolMemberRecord(user, memberId);
  assertCanManageProtectedMember(user, target, newRole);

  const { error } = await adminClient
    .from("school_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);
}

export async function updateMemberStatus(user: AppUser, memberId: string, newStatus: string) {
  if (!hasPermission(user.role, "users:manage")) {
    throw new Error("Unauthorized to modify user status");
  }
  const adminClient = createAdminClient();
  const target = await getSchoolMemberRecord(user, memberId);
  assertCanManageProtectedMember(user, target);

  const { error } = await adminClient
    .from("school_members")
    .update({ status: newStatus })
    .eq("id", memberId)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);
}
