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
  const parsed = changePasswordSchema.parse(values);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Please sign in again before changing your password.");
  if (!user.email) throw new Error("Your account email could not be verified. Please sign in again.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.currentPassword
  });

  if (verifyError) throw new Error("Current password is incorrect.");

  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.password });
  if (passwordError) throw new Error(passwordError.message);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);
}
