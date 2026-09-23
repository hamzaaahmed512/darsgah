import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/types/database";
import type { LibraryTeamMember } from "./library";

const assignableRoles = ["teacher", "head_teacher", "staff", "student_staff", "cashier"];
const memberColumns = "id,user_id,role,status,profiles!school_members_user_id_fkey(full_name,email,must_change_password)";
type MemberRow = { id: string; user_id: string; role: string; status: string; profiles: { full_name: string; email: string | null; must_change_password: boolean } | null };
function toTeamMember(row: MemberRow): LibraryTeamMember {
  return { member_id: row.id, user_id: row.user_id, role: row.role, status: row.status,
    full_name: row.profiles?.full_name || "Staff member", email: row.profiles?.email ?? null,
    must_change_password: Boolean(row.profiles?.must_change_password) };
}

function assertTeamAdmin(user: AppUser) {
  if (user.role !== "principal" && user.role !== "administrator") {
    throw new Error("Only principals and administrators can manage librarians.");
  }
}

export async function getAssignableLibraryStaff(user: AppUser): Promise<LibraryTeamMember[]> {
  assertTeamAdmin(user);
  const db = createAdminClient();
  const staff: LibraryTeamMember[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("school_members").select(memberColumns)
      .eq("school_id", user.schoolId).eq("status", "active").in("role", assignableRoles)
      .order("id").range(offset, offset + 499);
    if (error) throw new Error("Could not load staff. Please try again.");
    staff.push(...((data ?? []) as unknown as MemberRow[]).map(toTeamMember));
    if (!data || data.length < 500) return staff.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
}

export async function setLibraryTeamRole(user: AppUser, input: unknown): Promise<LibraryTeamMember> {
  assertTeamAdmin(user);
  const { memberId, action } = z.object({ memberId: z.string().uuid(), action: z.enum(["assign", "unassign"]) }).parse(input);
  const db = createAdminClient();
  const { data: row, error } = await db.from("school_members").select(memberColumns)
    .eq("school_id", user.schoolId).eq("id", memberId).maybeSingle();
  if (error || !row) throw new Error("Staff member could not be found in this school.");
  const member = toTeamMember(row as unknown as MemberRow);
  if (action === "assign" && (member.status !== "active" || !assignableRoles.includes(member.role))) {
    throw new Error("Select an active staff member who is not already a librarian.");
  }
  if (action === "unassign" && member.role !== "librarian") {
    throw new Error("This staff member is no longer a librarian. Refresh and try again.");
  }
  const role = action === "assign" ? "librarian" : "staff";
  // Clear the previous custom role so resolved permissions match the new role.
  // Match the observed role/status to avoid overwriting a concurrent account change.
  const result = await db.from("school_members").update({ role, custom_role_id: null })
    .eq("school_id", user.schoolId).eq("id", memberId).eq("role", member.role)
    .eq("status", member.status).select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Could not update the role. Refresh and try again.");
  return { ...member, role };
}
