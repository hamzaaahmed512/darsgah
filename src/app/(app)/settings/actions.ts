"use server";

import { requireUser } from "@/lib/auth/session";
import {
  getSchoolSettings,
  updateSchoolSettings,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  updatePrincipalTeachingAssignment,
  updateMemberRole,
  updateMemberStatus
} from "@/lib/services/settings";
import { resolveNotificationPreferences } from "@/lib/notification-preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateThemeAction(theme: string) {
  try {
    const user = await requireUser("settings:manage");
    const schoolSettings = await getSchoolSettings(user);
    await updateSchoolSettings(
      user,
      schoolSettings.school?.name ?? user.schoolName,
      schoolSettings.school?.timezone ?? "Asia/Karachi",
      { theme }
    );
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateNotificationPreferencesAction(data: {
  attendanceDeadlineEnabled: boolean;
  attendanceDeadlineTime: string;
  leaveRequestNotificationsEnabled: boolean;
}) {
  try {
    const user = await requireUser("settings:manage");
    const schoolSettings = await getSchoolSettings(user);
    const current = resolveNotificationPreferences(schoolSettings.settings);
    const attendanceDeadlineTime = /^\d{2}:\d{2}$/.test(data.attendanceDeadlineTime)
      ? data.attendanceDeadlineTime
      : current.attendanceDeadlineTime;

    await updateSchoolSettings(
      user,
      schoolSettings.school?.name ?? user.schoolName,
      schoolSettings.school?.timezone ?? "Asia/Karachi",
      {
        notificationPreferences: {
          attendanceDeadlineEnabled: data.attendanceDeadlineEnabled,
          attendanceDeadlineTime,
          leaveRequestNotificationsEnabled: data.leaveRequestNotificationsEnabled
        }
      }
    );
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateResultCardTemplateAction(data: {
  title: string;
  accentColor: string;
  layout: string;
  showAcademicYear: boolean;
  showAdmissionNumber: boolean;
  showTeacherComments: boolean;
  signatureLabels: string;
}) {
  try {
    const user = await requireUser("settings:manage");
    const schoolSettings = await getSchoolSettings(user);
    const accentColor = /^#[0-9a-f]{6}$/i.test(data.accentColor) ? data.accentColor : "#2563eb";

    await updateSchoolSettings(
      user,
      schoolSettings.school?.name ?? user.schoolName,
      schoolSettings.school?.timezone ?? "Asia/Karachi",
      {
        resultCardTemplate: {
          title: data.title.trim().slice(0, 80) || "Result Card",
          accentColor,
          layout: data.layout === "compact" ? "compact" : "standard",
          showAcademicYear: data.showAcademicYear,
          showAdmissionNumber: data.showAdmissionNumber,
          showTeacherComments: data.showTeacherComments,
          signatureLabels: data.signatureLabels.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3)
        }
      }
    );

    revalidatePath("/settings");
    revalidatePath("/results/print");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updatePrincipalTeachingAssignmentAction(classId: string | null) {
  try {
    const user = await requireUser("settings:manage");
    await updatePrincipalTeachingAssignment(user, classId);
    revalidatePath("/settings");
    revalidatePath("/attendance");
    revalidatePath("/classes");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── Academic Years ────────────────────────────────────────────────────────────

export async function createAcademicYearAction(data: { name: string; starts_on: string; ends_on: string; is_active: boolean }) {
  try {
    const user = await requireUser("settings:manage");
    await createAcademicYear(user, data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateAcademicYearAction(id: string, data: { name: string; starts_on: string; ends_on: string; is_active: boolean }) {
  try {
    const user = await requireUser("settings:manage");
    await updateAcademicYear(user, id, data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteAcademicYearAction(id: string) {
  try {
    const user = await requireUser("settings:manage");
    await deleteAcademicYear(user, id);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── Roles & Status ────────────────────────────────────────────────────────────

export async function updateMemberRoleAction(memberId: string, newRole: string) {
  try {
    const user = await requireUser("users:manage");
    await updateMemberRole(user, memberId, newRole);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateMemberStatusAction(memberId: string, newStatus: string) {
  try {
    const user = await requireUser("users:manage");
    await updateMemberStatus(user, memberId, newStatus);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createCustomRoleAction(name: string, baseRole: string, permissions: string[]) {
  try {
    const user = await requireUser("settings:manage");
    if (user.role !== "principal") throw new Error("Only the principal can create custom roles.");
    if (baseRole === "principal") throw new Error("Principal-based custom roles are not allowed. Use an administrator-based role for vice-principal style access.");
    const adminClient = createAdminClient();
    
    // Create the custom role
    const { data: customRole, error: roleError } = await adminClient
      .from("custom_roles")
      .insert({ school_id: user.schoolId, name, base_role: baseRole })
      .select("id")
      .single();
    if (roleError) throw roleError;
    
    // Add its initial permissions
    const permissionRows = permissions.map(p => ({
      school_id: user.schoolId,
      role_key: customRole.id,
      permission: p,
      granted: true
    }));
    
    if (permissionRows.length > 0) {
      const { error: permError } = await adminClient.from("role_permissions").insert(permissionRows);
      if (permError) throw permError;
    }
    
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteCustomRoleAction(id: string) {
  try {
    const user = await requireUser("settings:manage");
    if (user.role !== "principal") throw new Error("Only the principal can delete custom roles.");
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("custom_roles").delete().eq("school_id", user.schoolId).eq("id", id);
    if (error) throw error;
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function assignCustomRoleToUserAction(memberId: string, customRoleId: string | null) {
  try {
    const user = await requireUser("users:manage");
    const adminClient = createAdminClient();
    const { data: target, error: targetError } = await adminClient
      .from("school_members")
      .select("user_id,role")
      .eq("school_id", user.schoolId)
      .eq("id", memberId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("School member not found.");
    if (user.role === "administrator" && (target.user_id === user.id || target.role === "principal" || target.role === "administrator")) {
      throw new Error("Only the principal can manage administrator and principal accounts.");
    }
    if (customRoleId) {
      const { data: customRole, error: customRoleError } = await adminClient
        .from("custom_roles")
        .select("base_role")
        .eq("school_id", user.schoolId)
        .eq("id", customRoleId)
        .maybeSingle();
      if (customRoleError) throw customRoleError;
      if (!customRole) throw new Error("Selected custom role could not be found.");
      if (customRole.base_role === "principal") {
        throw new Error("Principal-based custom roles cannot be assigned.");
      }
      if (user.role !== "principal" && customRole.base_role === "administrator") {
        throw new Error("Only the principal can assign administrator-level custom roles.");
      }
    }
    const { error } = await adminClient
      .from("school_members")
      .update({ custom_role_id: customRoleId })
      .eq("school_id", user.schoolId)
      .eq("id", memberId);
    if (error) throw error;
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateRolePermissionsAction(roleKey: string, permissions: string[]) {
  try {
    const user = await requireUser("settings:manage");
    if (user.role !== "principal") throw new Error("Only the principal can update custom role permissions.");
    const adminClient = createAdminClient();
    
    // Delete all current role permissions for this roleKey
    await adminClient.from("role_permissions").delete().eq("school_id", user.schoolId).eq("role_key", roleKey);
    
    // Insert new ones
    if (permissions.length > 0) {
      const rows = permissions.map(p => ({
        school_id: user.schoolId,
        role_key: roleKey,
        permission: p,
        granted: true
      }));
      const { error } = await adminClient.from("role_permissions").insert(rows);
      if (error) throw error;
    }
    
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateUserPermissionOverridesAction(targetUserId: string, granted: string[], revoked: string[]) {
  try {
    const user = await requireUser("settings:manage");
    const adminClient = createAdminClient();
    
    // Delete existing overrides for this user
    await adminClient.from("user_permission_overrides").delete().eq("school_id", user.schoolId).eq("user_id", targetUserId);
    
    const rows: any[] = [];
    granted.forEach(p => rows.push({ school_id: user.schoolId, user_id: targetUserId, permission: p, granted: true }));
    revoked.forEach(p => rows.push({ school_id: user.schoolId, user_id: targetUserId, permission: p, granted: false }));
    
    if (rows.length > 0) {
      const { error } = await adminClient.from("user_permission_overrides").insert(rows);
      if (error) throw error;
    }
    
    revalidatePath("/settings");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
