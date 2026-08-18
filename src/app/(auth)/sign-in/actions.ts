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
  const parsed = signInSchema.parse(values);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed);

    if (error) {
      throw new Error(error.message);
    }

    return (await isPlatformAdminUser(data.user.id)) ? "/platform" : "/dashboard";
  } catch (error) {
    throw new Error(
      getSupabaseBrowserErrorMessage(error, "Unable to sign in right now. Please try again.")
    );
  }
}
