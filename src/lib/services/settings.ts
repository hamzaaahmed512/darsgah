import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/types/database";
import { hasPermission } from "@/lib/permissions";

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

  const { data, error } = await supabase
    .from("school_members")
    .select(`
      id,
      role,
      status,
      department,
      job_title,
      profiles!school_members_user_id_fkey(id, full_name, email, avatar_url)
    `)
    .eq("school_id", user.schoolId)
    .order("role");

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    memberId: row.id,
    userId: row.profiles?.id,
    fullName: row.profiles?.full_name ?? "—",
    email: row.profiles?.email ?? "—",
    avatarUrl: row.profiles?.avatar_url,
    role: row.role,
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

  const { error } = await adminClient
    .from("school_members")
    .update({ status: newStatus })
    .eq("id", memberId)
    .eq("school_id", user.schoolId);

  if (error) throw new Error(error.message);
}
