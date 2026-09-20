import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnnouncementHistory, getAnnouncements } from "@/lib/services/announcements";
import { publicApiError } from "@/lib/public-error";
import { apiRateLimitResponse } from "@/lib/auth/api-rate-limit";

export async function GET(req: Request) {
  const limited = await apiRateLimitResponse();
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return publicApiError(401);

  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get("history") === "1"
      ? await getAnnouncementHistory(user)
      : await getAnnouncements(user);
    return NextResponse.json(data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      type: item.type,
      publish_date: item.publish_date,
      expiry_date: item.expiry_date,
      attachment_url: item.attachment_url,
      is_archived: item.is_archived,
      created_by_name: item.created_by_name,
      is_read: item.is_read
    })));
  } catch (error) {
    return publicApiError(500, error);
  }
}
