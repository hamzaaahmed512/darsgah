import { redirect } from "next/navigation";
import { cache } from "react";
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

type CurrentUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  must_change_password: boolean | null;
  school_id: string;
  school_name: string;
  role: UserRole;
  department: string | null;
  job_title: string | null;
  custom_role_id: string | null;
  permissions: string[] | null;
  school_logo_url: string | null;
  school_favicon_url: string | null;
  school_short_name: string | null;
  school_full_name: string | null;
};

async function loadCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims().catch(() => ({ data: null, error: new Error("Invalid auth session") }));
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  // New installations resolve the profile, membership, permissions, school and
  // branding in one database request. Keep the old path as a rolling-deploy
  // fallback until the accompanying migration reaches every environment.
  const optimizedResult = await supabase.rpc("get_current_app_user").maybeSingle<CurrentUserRow>();
  if (!optimizedResult.error && optimizedResult.data) {
    const row = optimizedResult.data;
    return {
      id: row.user_id,
      email: row.email,
      fullName: row.full_name ?? row.email ?? "Darsgah User",
      avatarUrl: row.avatar_url,
      schoolId: row.school_id,
      schoolName: row.school_name,
      role: row.role,
      department: row.department,
      jobTitle: row.job_title,
      mustChangePassword: Boolean(row.must_change_password),
      permissions: row.permissions,
      customRoleId: row.custom_role_id,
      schoolLogoUrl: row.school_logo_url,
      schoolFaviconUrl: row.school_favicon_url,
      schoolShortName: row.school_short_name,
      schoolFullName: row.school_full_name
    };
  }

  const [profileResult, memberResult] = await Promise.all([
    supabase.from("profiles").select("full_name,email,avatar_url,must_change_password").eq("id", userId).maybeSingle(),
    supabase
      .from("school_members")
      .select("school_id, role, department, job_title, custom_role_id, schools(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle<MemberRow>()
  ]);

  const profile = profileResult.data;
  const member = memberResult.data;

  if (!member) {
    if (profileResult.error || memberResult.error) {
      console.error(`getCurrentUser lookup failed for user ${userId}:`, JSON.stringify({
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
      p_user_id: userId,
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
    id: userId,
    email: profile?.email ?? (typeof claimsData.claims.email === "string" ? claimsData.claims.email : null),
    fullName: profile?.full_name ?? (typeof claimsData.claims.email === "string" ? claimsData.claims.email : "Darsgah User"),
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

/** Deduplicates layout/page/service calls during the same server render. */
export const getCurrentUser = cache(loadCurrentUser);

export async function requireUser(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.mustChangePassword) redirect("/change-password");
  if (permission && !hasPermission(user.role, permission, user.permissions)) redirect("/unauthorized");
  return user;
}
