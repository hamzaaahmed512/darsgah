"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseBrowserErrorMessage } from "@/lib/supabase/browser-error";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
});

export type SignInValues = z.infer<typeof signInSchema>;

export type SignInResult = {
  success: boolean;
  error?: string;
};

export async function signInAction(values: SignInValues): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        success: false,
        error: getSupabaseBrowserErrorMessage(
          error,
          "Unable to sign in right now. Please try again."
        ),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getSupabaseBrowserErrorMessage(
        error,
        "Unable to sign in right now. Please try again."
      ),
    };
  }
}
