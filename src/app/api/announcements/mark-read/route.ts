import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markAnnouncementRead } from "@/lib/services/announcements";
import { publicApiError } from "@/lib/public-error";
import { apiRateLimitResponse } from "@/lib/auth/api-rate-limit";

export async function POST(req: NextRequest) {
  const limited = await apiRateLimitResponse();
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return publicApiError(401);

  try {
    const body = await req.json();
    await markAnnouncementRead(user, body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return publicApiError(500, error);
  }
}
