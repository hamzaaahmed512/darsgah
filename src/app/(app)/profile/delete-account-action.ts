"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";

export async function deleteOwnAccountAction(password: string): Promise<{ error: string } | never> {
  if (!password) return { error: "Enter your password to confirm account deletion." };
  try {
    if (!await consumeAuthRateLimit("login", 5, 60)) return { error: "Too many attempts. Try again in a minute." };
  } catch {
    return { error: "Account deletion is temporarily unavailable." };
  }

  const user = await requireUser();
  if (!user.email) return { error: "This account cannot be verified. Contact an administrator." };
  const session = await createClient();
  const { error: verificationError } = await session.auth.signInWithPassword({ email: user.email, password });
  if (verificationError) return { error: "Password verification failed." };

  const admin = createAdminClient();
  if (user.role === "principal") {
    const { count, error } = await admin.from("school_members")
      .select("id", { count: "exact", head: true })
      .eq("school_id", user.schoolId).eq("role", "principal").eq("status", "active").neq("user_id", user.id);
    if (error || !count) return { error: "Transfer principal access before deleting this account." };
  }

  const { error: erasureError } = await admin.rpc("erase_account_profile", {
    p_user_id: user.id, p_email: user.email
  });
  if (erasureError) return { error: "Account deletion could not be completed. Contact an administrator." };

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${randomUUID()}@example.invalid`,
    email_confirm: true,
    phone: "",
    password: randomBytes(48).toString("hex"),
    user_metadata: {},
    ban_duration: "876000h"
  });
  if (authError) return { error: "Account access requires administrator follow-up. Contact support." };

  await session.auth.signOut({ scope: "global" });
  redirect("/sign-in");
}
