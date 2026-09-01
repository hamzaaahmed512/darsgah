import { requireUser } from "@/lib/auth/session";
import { 
  getSchoolSettings,
  getAcademicYears,
  getPrincipalTeachingSettings,
  getSchoolMembers
} from "@/lib/services/settings";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser("settings:manage");
  const canManageRoles = user.role === "administrator" || user.role === "principal";

  const supabase = await createClient();

  const [schoolSettings, academicYears, principalTeachingSettings, members, customRolesRes, rolePermsRes, overridesRes] = await Promise.all([
    getSchoolSettings(user),
    getAcademicYears(user),
    user.role === "principal" ? getPrincipalTeachingSettings(user) : Promise.resolve({ classes: [], assignedClassId: null }),
    canManageRoles ? getSchoolMembers(user) : Promise.resolve([]),
    canManageRoles ? supabase.from("custom_roles").select("*").eq("school_id", user.schoolId).order("name") : Promise.resolve({ data: [] }),
    canManageRoles ? supabase.from("role_permissions").select("*").eq("school_id", user.schoolId) : Promise.resolve({ data: [] }),
    canManageRoles ? supabase.from("user_permission_overrides").select("*").eq("school_id", user.schoolId) : Promise.resolve({ data: [] })
  ]);

  const customRoles = customRolesRes.data ?? [];
  const rolePermissions = rolePermsRes.data ?? [];
  const userOverrides = overridesRes.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Configure notification preferences, teaching assignments, result cards, academic sessions, and user roles."
      />

      <SettingsTabs
        user={user}
        schoolSettings={schoolSettings}
        academicYears={academicYears}
        principalTeachingSettings={principalTeachingSettings}
        members={members}
        customRoles={customRoles}
        rolePermissions={rolePermissions}
        userOverrides={userOverrides}
        initialTab={params.tab}
      />
    </>
  );
}
