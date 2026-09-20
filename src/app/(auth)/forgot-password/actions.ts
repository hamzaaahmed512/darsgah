"use server";

import { z } from "zod";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/email";

const success = "Password reset instructions have been sent if an account exists for that email.";

export async function requestPasswordResetAction(value: string) {
  try {
    if (!await consumeAuthRateLimit("password_reset", 3, 3600)) {
      return { error: "Too many reset requests. Try again later." };
    }
  } catch {
    return { error: "Password reset is temporarily unavailable." };
  }
  const email = z.string().trim().email().safeParse(normalizeEmail(value));
  if (!email.success) return { error: "Enter a valid email address." };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { error: "Password reset is temporarily unavailable." };
  try {
    const client = await createClient();
    await client.auth.resetPasswordForEmail(email.data, {
      redirectTo: new URL("/reset-password", appUrl).toString()
    });
    return { message: success };
  } catch {
    return { message: success };
  }
}
