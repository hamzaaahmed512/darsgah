"use server";

import { requireUser } from "@/lib/auth/session";
import {
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement
} from "@/lib/services/announcements";
import { revalidatePath } from "next/cache";
import type { Announcement } from "@/types/database";

export async function createAnnouncementAction(
  data: Pick<Announcement, "title" | "description" | "priority" | "type" | "audience_type" | "publish_date" | "expiry_date" | "audience_value">
) {
  try {
    const user = await requireUser("announcements:manage");
    await createAnnouncement(user, data);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateAnnouncementAction(
  id: string,
  data: Partial<Pick<Announcement, "title" | "description" | "priority" | "type" | "audience_type" | "publish_date" | "expiry_date" | "audience_value" | "is_archived">>
) {
  try {
    const user = await requireUser("announcements:manage");
    await updateAnnouncement(user, id, data);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function archiveAnnouncementAction(id: string) {
  try {
    const user = await requireUser("announcements:manage");
    await archiveAnnouncement(user, id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteAnnouncementAction(id: string) {
  try {
    const user = await requireUser("announcements:manage");
    await deleteAnnouncement(user, id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
