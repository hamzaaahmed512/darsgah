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
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/sign-in?next=/platform");

  const [isPlatformAdmin, profileResult] = await Promise.all([
    isPlatformAdminUser(userId),
    supabase.from("profiles").select("must_change_password").eq("id", userId).maybeSingle<{ must_change_password: boolean }>()
  ]);
  if (!isPlatformAdmin) redirect("/unauthorized");
  if (profileResult.data?.must_change_password) redirect("/change-password?next=/platform");

  const email = typeof data.claims.email === "string" ? data.claims.email : "Platform admin";
  return { id: userId, email };
}
