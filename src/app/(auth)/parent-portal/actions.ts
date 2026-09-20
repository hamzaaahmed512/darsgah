"use server";

import { z } from "zod";
import { authenticateParent, signOutParent } from "@/lib/parent-portal";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";

const schema = z.object({ cnic: z.string().trim().min(1), dateOfBirth: z.string().trim().min(1) });

export async function parentSignInAction(values: { cnic: string; dateOfBirth: string }) {
  try {
    if (!await consumeAuthRateLimit("parent_login", 5, 60)) {
      return { error: "Too many attempts. Try again in a minute." };
    }
  } catch {
    return { error: "Sign-in is temporarily unavailable." };
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: "Enter the student CNIC and date of birth." };
  return authenticateParent(parsed.data.cnic, parsed.data.dateOfBirth);
}

export async function parentSignOutAction() { await signOutParent(); }
