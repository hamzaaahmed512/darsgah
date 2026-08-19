"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export async function changePasswordAction(values: ChangePasswordValues) {
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  if (parsed.data.currentPassword === parsed.data.password) {
    return { error: "New password should be different from the old password." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Please sign in again before changing your password." };
  if (!user.email) return { error: "Your account email could not be verified. Please sign in again." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword
  });

  if (verifyError) return { error: "Current password is incorrect." };

  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (passwordError) return { error: passwordError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };
  
  return { success: true };
}
