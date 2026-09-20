import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationSummary } from "@/lib/services/notifications";
import { publicApiError } from "@/lib/public-error";
import { apiRateLimitResponse } from "@/lib/auth/api-rate-limit";

export async function GET() {
  const limited = await apiRateLimitResponse();
  if (limited) return limited;
  const user = await getCurrentUser();
  if (!user) return publicApiError(401);

  try {
    return NextResponse.json(await getNotificationSummary(user));
  } catch (error) {
    return publicApiError(500, error);
  }
}
