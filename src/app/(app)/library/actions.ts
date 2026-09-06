"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { mutateLibrary } from "@/lib/services/library";

export async function libraryAction(form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser("library:manage");
  try {
    const input = Object.fromEntries(form.entries());
    if (typeof input.borrower === "string") {
      const [kind, id] = input.borrower.split(":");
      input.borrower_kind = kind;
      input.borrower_id = id;
    }
    await mutateLibrary(user, input);
    revalidatePath("/library");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save. Please try again." };
  }
}
