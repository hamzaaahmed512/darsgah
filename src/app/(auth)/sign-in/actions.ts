// src/app/(auth)/sign-in/actions.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseBrowserErrorMessage } from "@/lib/supabase/browser-error";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
});

export type SignInValues = z.infer<typeof signInSchema>;

export async function signInAction(values: SignInValues) {
  const parsed = signInSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: "Invalid input values." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      // RETURN the error string; DO NOT throw it
      return {
        success: false,
        error: getSupabaseBrowserErrorMessage(
          error,
          "Invalid email or password."
        ),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}