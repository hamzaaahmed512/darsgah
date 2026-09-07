import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { libraryActionSchema } from "@/lib/validation/library";

export type LibraryBook = {
  id: string;
  title: string;
  /** Empty string when not provided. */
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  shelf: string;
  archived: boolean;
  /** Default replacement cost for new copies. NULL = not specified. */
  default_replacement_cost: number | null;
};
export type LibraryCopy = {
  id: string;
  book_id: string;
  /** Stored identifier; labelled "Copy ID" in the UI. */
  accession: string;
  status: string;
  /** NULL means the replacement cost has not been specified for this copy. */
  replacement_cost: number | null;
};
export type LibraryLoan = { id: string; copy_id: string; borrower_name: string; borrower_kind: string; borrower_id: string; issued_at: string; due_date: string; returned_at: string | null; outcome: string | null; renewals: number; fine_per_day: number; fine_amount: number; paid_amount: number; waived_amount: number };
export type LibraryBorrower = { id: string; kind: string; name: string; reference: string };
export type LibraryReservation = { id: string; book_id: string; borrower_name: string; status: string; created_at: string };
export type LibrarySettings = { loan_days: number; max_loans: number; max_renewals: number; fine_per_day: number };
export type LibraryEvent = { id: string; action: string; created_at: string; details: Record<string, string> };

export async function getLibrary(user: AppUser) {
  if (!hasPermission(user.role, "library:view", user.permissions)) throw new Error("Library access denied");
  const db = await createClient();
  // Page through PostgREST's row limit so counts and inventory remain correct for larger schools.
  async function all<T>(table: string, order: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await db.from(table).select("*").eq("school_id", user.schoolId).order(order).order("id").range(offset, offset + 499);
      if (result.error) throw new Error(result.error.code === "PGRST205" ? "LIBRARY_MIGRATION_REQUIRED" : result.error.message);
      rows.push(...(result.data as T[]));
      if (result.data.length < 500) return rows;
    }
  }
  async function allBorrowers(): Promise<LibraryBorrower[]> {
    const rows: LibraryBorrower[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await db.rpc("library_borrowers", { p_school_id: user.schoolId }).order("kind").order("id").range(offset, offset + 499);
      if (result.error) throw new Error(result.error.code === "PGRST202" ? "LIBRARY_MIGRATION_REQUIRED" : result.error.message);
      rows.push(...(result.data as LibraryBorrower[]));
      if (result.data.length < 500) return rows;
    }
  }
  const [books, copies, loans, reservations, settings, borrowers, events] = await Promise.all([
    all<LibraryBook>("library_books", "title"), all<LibraryCopy>("library_copies", "accession"),
    all<LibraryLoan>("library_loans", "issued_at"), all<LibraryReservation>("library_reservations", "created_at"),
    db.from("library_settings").select("*").eq("school_id", user.schoolId).single(),
    allBorrowers(),
    db.from("library_events").select("id,action,created_at,details").eq("school_id", user.schoolId).order("created_at", { ascending: false }).limit(100)
  ]);
  for (const result of [settings, events]) if (result.error) throw new Error(result.error.message);
  return { books, copies, loans, reservations, settings: settings.data as LibrarySettings, borrowers, events: (events.data ?? []) as LibraryEvent[] };
}
export type LibraryData = Awaited<ReturnType<typeof getLibrary>>;

export async function mutateLibrary(user: AppUser, input: Record<string, unknown>) {
  if (!hasPermission(user.role, "library:manage", user.permissions)) throw new Error("Library management access denied");
  const parsed = libraryActionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map(issue => `${issue.path.join(" ")}: ${issue.message}`).join(". "));
  const { action, ...data } = parsed.data;
  const db = await createClient();
  const { error } = await db.rpc("library_mutate", { p_school_id: user.schoolId, p_action: action, p_data: data });
  if (error) {
    if (error.code === "23505") throw new Error("That accession number or waiting reservation already exists.");
    throw new Error(error.message);
  }
}
