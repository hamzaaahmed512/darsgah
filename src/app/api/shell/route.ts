import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { apiRateLimitResponse } from "@/lib/auth/api-rate-limit";
import { getAnnouncements } from "@/lib/services/announcements";
import { getNotificationSummary } from "@/lib/services/notifications";
import { publicApiError } from "@/lib/public-error";

/** Non-essential navigation data loads after the authorized page is visible. */
export async function GET() {
  const limited = await apiRateLimitResponse();
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return publicApiError(401);
  if (user.mustChangePassword) return publicApiError(403);
  try {
    const [summary, announcements] = await Promise.all([
      getNotificationSummary(user),
      getAnnouncements(user)
    ]);
    return NextResponse.json({
      ...summary,
      announcements: announcements.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        priority: item.priority, type: item.type, publish_date: item.publish_date,
        expiry_date: item.expiry_date, attachment_url: item.attachment_url,
        is_archived: item.is_archived, created_by_name: item.created_by_name,
        is_read: item.is_read
      }))
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return publicApiError(500, error);
  }
}
