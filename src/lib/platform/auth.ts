import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function isPlatformAdminUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    // The platform migration may not have been applied yet.
    if (error.code === "42P01" || error.code === "PGRST205") return false;
    throw new Error(`Unable to verify platform access: ${error.message}`);
  }
  return Boolean(data);
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/platform");
  if (!(await isPlatformAdminUser(user.id))) redirect("/unauthorized");
  return { id: user.id, email: user.email ?? "Platform admin" };
}
