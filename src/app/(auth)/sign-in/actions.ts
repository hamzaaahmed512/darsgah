"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseBrowserErrorMessage } from "@/lib/supabase/browser-error";
import { isPlatformAdminUser } from "@/lib/platform/auth";
import { resolveAuthDestination } from "@/lib/auth/destination";
import { normalizeEmail } from "@/lib/email";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").transform(normalizeEmail),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional()
});

export type SignInValues = z.infer<typeof signInSchema>;

export async function signInAction(values: SignInValues) {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { error: error.message };
    }

    const [isPlatformAdmin, profileResult] = await Promise.all([
      isPlatformAdminUser(data.user.id),
      supabase.from("profiles").select("must_change_password").eq("id", data.user.id).maybeSingle<{ must_change_password: boolean }>()
    ]);
    const destination = resolveAuthDestination(parsed.data.next, isPlatformAdmin);

    if (profileResult.data?.must_change_password) {
      return { destination: `/change-password?next=${encodeURIComponent(destination)}` };
    }

    return { destination };
  } catch (error) {
    console.error("Sign in error:", error);
    return { 
      error: getSupabaseBrowserErrorMessage(error, "Unable to sign in right now. Please try again.") 
    };
  }
}
