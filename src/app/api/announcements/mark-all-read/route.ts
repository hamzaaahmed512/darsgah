import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllAnnouncementsRead } from "@/lib/services/announcements";
import { publicApiError } from "@/lib/public-error";
import { apiRateLimitResponse } from "@/lib/auth/api-rate-limit";

export async function POST() {
  const limited = await apiRateLimitResponse();
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return publicApiError(401);

  try {
    await markAllAnnouncementsRead(user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return publicApiError(500, error);
  }
}
