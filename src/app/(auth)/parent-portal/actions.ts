"use server";

import { z } from "zod";
import { authenticateParent, signOutParent } from "@/lib/parent-portal";

const schema = z.object({ cnic: z.string().trim().min(1), dateOfBirth: z.string().trim().min(1) });

export async function parentSignInAction(values: { cnic: string; dateOfBirth: string }) {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: "Enter the student CNIC and date of birth." };
  return authenticateParent(parsed.data.cnic, parsed.data.dateOfBirth);
}

export async function parentSignOutAction() { await signOutParent(); }
