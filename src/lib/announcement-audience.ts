import type { Announcement } from "@/types/database";

export function isParentAnnouncementAudience(announcement: Pick<Announcement, "audience_type" | "audience_value">) {
  return announcement.audience_type === "parents"
    || (announcement.audience_type === "roles" && announcement.audience_value?.trim() === "parents");
}
