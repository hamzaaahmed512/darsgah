import { createClient } from "@/lib/supabase/server";
import type { AppUser, Announcement, AnnouncementWithRead } from "@/types/database";
import { hasPermission } from "@/lib/permissions";

// ─── Read Announcements ────────────────────────────────────────────────────────

function announcementVisibleToUser(announcement: Announcement, user: AppUser) {
  const audienceValue = announcement.audience_value?.trim();

  if (audienceValue === `user:${user.id}`) return true;
  if (announcement.audience_type === "all") return true;
  if (announcement.audience_type === "teachers") return user.role === "teacher" || user.role === "head_teacher" || user.role === "principal";
  if (announcement.audience_type === "registrar") return user.role === "student_staff";
  if (announcement.audience_type === "admin") return user.role === "administrator" || user.role === "principal";
  if (announcement.audience_type === "roles") {
    return Boolean(audienceValue?.split(",").map((item) => item.trim()).includes(user.role));
  }

  return true;
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
      created_by_name: row.profiles?.full_name ?? null,
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

  return (data || []).map((row: any) => ({
    ...row,
    created_by_name: row.profiles?.full_name ?? null,
    is_read: Array.isArray(row.announcement_reads) && row.announcement_reads.length > 0
  }));
}

export async function getUnreadAnnouncementCount(user: AppUser): Promise<number> {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Get all non-archived, published announcements for this school
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("is_archived", false)
    .lte("publish_date", today);

  if (!announcements?.length) return 0;

  const ids = announcements.map((a) => a.id);

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
    .select("id")
    .eq("school_id", user.schoolId)
    .eq("is_archived", false)
    .lte("publish_date", today);

  if (!announcements?.length) return;

  const inserts = announcements.map((a) => ({
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
  const { error } = await supabase.from("announcements").insert({
    school_id: user.schoolId,
    created_by: user.id,
    ...values
  });
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
