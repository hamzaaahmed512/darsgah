import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationSummary } from "@/lib/services/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ notifications: [], sidebarBadges: { attendance: 0, leave: 0 } }, { status: 401 });

  try {
    return NextResponse.json(await getNotificationSummary(user));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
