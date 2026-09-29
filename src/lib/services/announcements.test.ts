import { describe, expect, it } from "vitest";
import { announcementVisibleToUser } from "./announcements";
import { isParentAnnouncementAudience } from "@/lib/announcement-audience";
import type { Announcement, AppUser, UserRole } from "@/types/database";

function user(role: UserRole, permissions: string[] | null = null): AppUser {
  return { id: `${role}-id`, email: null, fullName: role, avatarUrl: null, schoolId: "school-1", schoolName: "School", role, department: null, jobTitle: null, mustChangePassword: false, permissions, customRoleId: null };
}

function announcement(audience_type: Announcement["audience_type"], audience_value: string | null = null): Announcement {
  return { id: "a-1", school_id: "school-1", title: "Notice", description: "Details", priority: "medium", type: "general", audience_type, audience_value, publish_date: "2026-09-29", expiry_date: null, attachment_url: null, is_archived: false, created_by: "principal-id", created_at: "2026-09-29T00:00:00Z", updated_at: "2026-09-29T00:00:00Z" };
}

describe("announcement audience isolation", () => {
  it("keeps parent announcements out of ordinary staff notifications", () => {
    const parentNotice = announcement("parents");
    expect(isParentAnnouncementAudience(parentNotice)).toBe(true);
    expect(announcementVisibleToUser(parentNotice, user("teacher"))).toBe(false);
    expect(announcementVisibleToUser(parentNotice, user("staff"))).toBe(false);
  });

  it("shows staff announcements only to their intended staff audience", () => {
    expect(announcementVisibleToUser(announcement("all"), user("staff"))).toBe(true);
    expect(announcementVisibleToUser(announcement("teachers"), user("teacher"))).toBe(true);
    expect(announcementVisibleToUser(announcement("teachers"), user("student_staff"))).toBe(false);
    expect(announcementVisibleToUser(announcement("registrar"), user("student_staff"))).toBe(true);
    expect(announcementVisibleToUser(announcement("admin"), user("teacher"))).toBe(false);
  });

  it("lets leadership review both staff and parent channels", () => {
    expect(announcementVisibleToUser(announcement("parents"), user("principal"))).toBe(true);
    expect(announcementVisibleToUser(announcement("teachers"), user("administrator"))).toBe(true);
  });

  it("supports legacy parent and direct-user role sentinels without leaking them", () => {
    expect(isParentAnnouncementAudience(announcement("roles", "parents"))).toBe(true);
    expect(announcementVisibleToUser(announcement("roles", "parents"), user("teacher"))).toBe(false);
    expect(announcementVisibleToUser(announcement("roles", "user:teacher-id"), user("teacher"))).toBe(true);
    expect(announcementVisibleToUser(announcement("roles", "user:teacher-id"), user("staff"))).toBe(false);
  });
});
