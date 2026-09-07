"use server";

import { z } from "zod";
import { authenticateParent, signOutParent } from "@/lib/parent-portal";

const schema = z.object({ school: z.string().trim().min(1), cnic: z.string().trim().min(1), phone: z.string().trim().min(1) });

export async function parentSignInAction(values: { school: string; cnic: string; phone: string }) {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: "Enter your school, CNIC, and phone number." };
  return authenticateParent(parsed.data.school, parsed.data.cnic, parsed.data.phone);
}

export async function parentSignOutAction() { await signOutParent(); }