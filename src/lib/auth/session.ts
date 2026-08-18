import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/types/database";
import { hasPermission, type Permission } from "@/lib/permissions";

type MemberRow = {
  school_id: string;
  role: UserRole;
  department: string | null;
  job_title: string | null;
  custom_role_id: string | null;
  schools: { name: string } | null;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, memberResult] = await Promise.all([
    supabase.from("profiles").select("full_name,email,avatar_url,must_change_password").eq("id", user.id).maybeSingle(),
    supabase
      .from("school_members")
      .select("school_id, role, department, job_title, custom_role_id, schools(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle<MemberRow>()
  ]);

  const profile = profileResult.data;
  const member = memberResult.data;

  if (!member) {
    if (profileResult.error || memberResult.error) {
      console.error(`getCurrentUser lookup failed for user ${user.id}:`, JSON.stringify({
        profileError: profileResult.error,
        memberError: memberResult.error
      }, null, 2));
    }
    return null;
  }

  // Fetch resolved permissions via database function
  let permissions: string[] | null = null;
  try {
    const { data: permsData } = await supabase.rpc("get_resolved_permissions", {
      p_user_id: user.id,
      p_school_id: member.school_id
    });
    if (Array.isArray(permsData)) {
      permissions = permsData as string[];
    }
  } catch {
    // If RPC fails (e.g. migration not yet applied), fall back to static permissions
    permissions = null;
  }

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.email ?? "GoCampusFlow User",
    avatarUrl: profile?.avatar_url ?? null,
    schoolId: member.school_id,
    schoolName: member.schools?.name ?? "School",
    role: member.role,
    department: member.department,
    jobTitle: member.job_title,
    mustChangePassword: Boolean(profile?.must_change_password),
    permissions,
    customRoleId: member.custom_role_id ?? null
  };
}

export async function requireUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (permission && !hasPermission(user.role, permission, user.permissions)) redirect("/unauthorized");
  return user;
}
