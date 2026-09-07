"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { mutateLibrary, searchBorrowers, searchCopies, type SearchResultBorrower, type SearchResultCopy } from "@/lib/services/library";

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

export async function updateCopyStatusAction(form: FormData) {
  const user = await requireUser("library:manage");
  const copyId = form.get("id")?.toString();
  const status = form.get("status")?.toString();
  const bookId = form.get("book_id")?.toString();
  if (!copyId || !status || !bookId) return;
  await mutateLibrary(user, { action: "copy_status", id: copyId, status });
  revalidatePath("/library");
  revalidatePath(`/library/${bookId}`);
}

export async function searchBorrowersAction(
  kind: "student" | "staff",
  query: string,
  gradeId?: string,
  sectionId?: string
): Promise<SearchResultBorrower[]> {
  const user = await requireUser("library:view");
  return searchBorrowers(user, kind, query, gradeId, sectionId);
}

export async function searchCopiesAction(
  query: string,
  borrowerKind?: string,
  borrowerId?: string
): Promise<SearchResultCopy[]> {
  const user = await requireUser("library:view");
  return searchCopies(user, query, borrowerKind, borrowerId);
}
