"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseBrowserErrorMessage } from "@/lib/supabase/browser-error";
import { isPlatformAdminUser } from "@/lib/platform/auth";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
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

    const destination = (await isPlatformAdminUser(data.user.id)) ? "/platform" : "/dashboard";
    return { destination };
  } catch (error) {
    console.error("Sign in error:", error);
    return { 
      error: getSupabaseBrowserErrorMessage(error, "Unable to sign in right now. Please try again.") 
    };
  }
}
