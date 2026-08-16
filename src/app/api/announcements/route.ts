import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnnouncementHistory, getAnnouncements } from "@/lib/services/announcements";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get("history") === "1"
      ? await getAnnouncementHistory(user)
      : await getAnnouncements(user);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
