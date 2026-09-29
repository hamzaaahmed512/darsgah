import { createClient } from "@/lib/supabase/server";
import type { AppUser, Announcement, AnnouncementWithRead } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { formatDisplayName } from "@/lib/student-name";
import { isParentAnnouncementAudience } from "@/lib/announcement-audience";

// ─── Read Announcements ────────────────────────────────────────────────────────

export function announcementVisibleToUser(announcement: Announcement, user: AppUser) {
  const audienceValue = announcement.audience_value?.trim();
  const canManage = hasPermission(user.role, "announcements:manage", user.permissions);

  // Leadership needs both channels for creation, review, and archival. The
  // notification UI separates those rows into Staff and Parents tabs.
  if (canManage) return true;
  if (audienceValue === `user:${user.id}`) return true;
  if (announcement.audience_type === "all") return true;
  if (isParentAnnouncementAudience(announcement)) return false;
  if (announcement.audience_type === "teachers") return user.role === "teacher" || user.role === "head_teacher";
  if (announcement.audience_type === "registrar") return user.role === "student_staff";
  if (announcement.audience_type === "admin") return user.role === "administrator";
  if (announcement.audience_type === "roles") {
    return Boolean(audienceValue?.split(",").map((item) => item.trim()).includes(user.role));
  }

  return false;
}

export async function getAnnouncements(user: AppUser): Promise<AnnouncementWithRead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(`
      *,
      profiles!announcements_created_by_fkey(full_name),
      announcement_reads(id)
    `)
    .eq("school_id", user.schoolId)
    .eq("is_archived", false)
    .lte("publish_date", new Date().toISOString().split("T")[0])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || [])
    .filter((row: any) => announcementVisibleToUser(row, user))
    .map((row: any) => ({
      ...row,
      created_by_name: formatDisplayName(row.profiles?.full_name) || null,
      is_read: Array.isArray(row.announcement_reads) && row.announcement_reads.length > 0
    }));
}

export async function getAnnouncementHistory(user: AppUser): Promise<AnnouncementWithRead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(`
      *,
      profiles!announcements_created_by_fkey(full_name),
      announcement_reads(id)
    `)
    .eq("school_id", user.schoolId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);

  return (data || []).filter((row: any) => announcementVisibleToUser(row, user)).map((row: any) => ({
    ...row,
    created_by_name: formatDisplayName(row.profiles?.full_name) || null,
    is_read: Array.isArray(row.announcement_reads) && row.announcement_reads.length > 0
  }));
}

export async function getUnreadAnnouncementCount(user: AppUser): Promise<number> {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Get all non-archived, published announcements for this school
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id,title,description,priority,type,audience_type,audience_value,publish_date,expiry_date,attachment_url,is_archived,created_by,created_at,updated_at,school_id")
    .eq("school_id", user.schoolId)
    .eq("is_archived", false)
    .lte("publish_date", today);

  const visibleAnnouncements = (announcements ?? []).filter((announcement: any) => announcementVisibleToUser(announcement, user));
  if (!visibleAnnouncements.length) return 0;

  const ids = visibleAnnouncements.map((a) => a.id);

  // Get reads for this user
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id)
    .in("announcement_id", ids);

  const readIds = new Set((reads || []).map((r: any) => r.announcement_id));
  return ids.filter((id) => !readIds.has(id)).length;
}

export async function markAnnouncementRead(user: AppUser, announcementId: string) {
  const supabase = await createClient();
  await supabase.from("announcement_reads").upsert({
    school_id: user.schoolId,
    announcement_id: announcementId,
    user_id: user.id
  });
}

export async function markAllAnnouncementsRead(user: AppUser) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id,title,description,priority,type,audience_type,audience_value,publish_date,expiry_date,attachment_url,is_archived,created_by,created_at,updated_at,school_id")
    .eq("school_id", user.schoolId)
    .eq("is_archived", false)
    .lte("publish_date", today);

  const visibleAnnouncements = (announcements ?? []).filter((announcement: any) => announcementVisibleToUser(announcement, user));
  if (!visibleAnnouncements.length) return;

  const inserts = visibleAnnouncements.map((a) => ({
    school_id: user.schoolId,
    announcement_id: a.id,
    user_id: user.id
  }));

  await supabase.from("announcement_reads").upsert(inserts, { onConflict: "school_id,announcement_id,user_id" });
}

// ─── CRUD (Principal only) ─────────────────────────────────────────────────────

export async function createAnnouncement(
  user: AppUser,
  values: Pick<
    Announcement,
    "title" | "description" | "priority" | "type" | "audience_type" | "publish_date" | "expiry_date" | "audience_value"
  >
) {
  if (!hasPermission(user.role, "announcements:manage", user.permissions)) {
    throw new Error("Only principals and administrators can create announcements");
  }
  const supabase = await createClient();
  const announcement = {
    school_id: user.schoolId,
    created_by: user.id,
    ...values
  };
  let { error } = await supabase.from("announcements").insert(announcement);

  // Older deployed schemas do not yet include `parents` in the audience check.
  // Store a compatible sentinel until the migration is applied, while readers
  // continue treating it as a parent-only announcement.
  if (error?.code === "23514" && values.audience_type === "parents") {
    ({ error } = await supabase.from("announcements").insert({
      ...announcement,
      audience_type: "roles",
      audience_value: "parents"
    }));
  }
  if (error) throw new Error(error.message);
}

export async function updateAnnouncement(
  user: AppUser,
  id: string,
  values: Partial<Pick<Announcement, "title" | "description" | "priority" | "type" | "audience_type" | "publish_date" | "expiry_date" | "audience_value" | "is_archived">>
) {
  if (!hasPermission(user.role, "announcements:manage", user.permissions)) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update(values)
    .eq("id", id)
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
}

export async function archiveAnnouncement(user: AppUser, id: string) {
  return updateAnnouncement(user, id, { is_archived: true });
}

export async function deleteAnnouncement(user: AppUser, id: string) {
  if (!hasPermission(user.role, "announcements:manage", user.permissions)) throw new Error("Unauthorized");
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("school_id", user.schoolId);
  if (error) throw new Error(error.message);
}
