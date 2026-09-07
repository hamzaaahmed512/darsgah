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

export type LibraryLoan = {
  id: string;
  copy_id: string;
  borrower_name: string;
  borrower_kind: string;
  borrower_id: string;
  issued_at: string;
  due_date: string;
  returned_at: string | null;
  outcome: string | null;
  renewals: number;
  fine_per_day: number;
  fine_amount: number;
  paid_amount: number;
  waived_amount: number;
  book_id?: string;
  book_title?: string;
  book_category?: string;
  accession?: string;
  student_grade_id?: string | null;
  student_grade_name?: string | null;
  student_section_id?: string | null;
  student_section_name?: string | null;
  student_registration_number?: string | null;
  staff_id?: string | null;
  staff_department?: string | null;
};

export type LibraryBorrower = {
  id: string;
  kind: string;
  name: string;
  reference: string;
};

export type LibraryReservation = {
  id: string;
  book_id: string;
  borrower_kind: string;
  borrower_id: string;
  borrower_name: string;
  status: string;
  created_at: string;
  book_title?: string;
  author?: string;
  grade_name?: string | null;
  section_name?: string | null;
  registration_number?: string | null;
  department?: string | null;
  job_title?: string | null;
  email?: string | null;
  total_copies?: number;
  available_copies?: number;
  queue_position?: number;
  is_front_of_queue?: boolean;
  is_ready_to_issue?: boolean;
};

export type LibrarySettings = {
  loan_days: number;
  max_loans: number;
  max_renewals: number;
  fine_per_day: number;
  student_loan_days: number;
  student_max_loans: number;
  student_max_renewals: number;
  student_renewal_days: number;
  staff_loan_days: number;
  staff_max_loans: number;
  staff_max_renewals: number;
  staff_renewal_days: number;
};

export type LibraryEvent = {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, string>;
};

export type LibraryGrade = {
  id: string;
  name: string;
  sort_order: number;
};

export type LibrarySection = {
  id: string;
  name: string;
};

export type LibraryTeamMember = {
  member_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
  must_change_password: boolean;
};

export type SearchResultBorrower = {
  id: string;
  kind: "student" | "staff";
  name: string;
  reference: string;
  grade_id: string | null;
  grade_name: string | null;
  section_id: string | null;
  section_name: string | null;
  registration_number: string | null;
  email: string | null;
  department: string | null;
  job_title: string | null;
  active_loans_count: number;
  max_loans_allowed: number;
  has_overdue: boolean;
  is_eligible: boolean;
  ineligibility_reason: string | null;
};

export type SearchResultCopy = {
  id: string;
  accession: string;
  status: string;
  book_id: string;
  book_title: string;
  author: string;
  isbn: string;
  shelf: string;
  is_eligible: boolean;
  ineligibility_reason: string | null;
};

export async function getLibrary(user: AppUser) {
  if (!hasPermission(user.role, "library:view", user.permissions)) throw new Error("Library access denied");
  const db = await createClient();

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
      if (result.error) {
        if (result.error.code === "PGRST202") throw new Error("LIBRARY_MIGRATION_REQUIRED");
        return [];
      }
      rows.push(...(result.data as LibraryBorrower[]));
      if (result.data.length < 500) return rows;
    }
  }

  async function getDetailedLoans(): Promise<LibraryLoan[]> {
    const { data, error } = await db.rpc("library_loans_detailed", { p_school_id: user.schoolId });
    if (error) {
      return all<LibraryLoan>("library_loans", "issued_at");
    }
    return (data ?? []) as LibraryLoan[];
  }

  async function getDetailedReservations(): Promise<LibraryReservation[]> {
    const { data, error } = await db.rpc("library_reservations_detailed", { p_school_id: user.schoolId });
    if (error) {
      // Fallback to table select if RPC fails or during migration
      return all<LibraryReservation>("library_reservations", "created_at");
    }
    return (data ?? []) as LibraryReservation[];
  }

  async function getLibrariansTeam(): Promise<LibraryTeamMember[]> {
    const { data, error } = await db
      .from("staff_directory")
      .select("member_id, user_id, full_name, email, role, status, must_change_password")
      .eq("school_id", user.schoolId)
      .eq("role", "librarian")
      .order("full_name");
    if (error) {
      if (error.code === "PGRST205") return [];
      return [];
    }
    return (data ?? []).map((row: any) => ({
      member_id: row.member_id,
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      role: row.role,
      status: row.status,
      must_change_password: Boolean(row.must_change_password)
    }));
  }

  const [books, copies, loans, reservations, settingsResult, borrowers, events, grades, sections, team] = await Promise.all([
    all<LibraryBook>("library_books", "title"),
    all<LibraryCopy>("library_copies", "accession"),
    getDetailedLoans(),
    getDetailedReservations(),
    db.from("library_settings").select("*").eq("school_id", user.schoolId).single(),
    allBorrowers(),
    db.from("library_events").select("id,action,created_at,details").eq("school_id", user.schoolId).order("created_at", { ascending: false }).limit(100),
    db.from("grades").select("id,name,sort_order").eq("school_id", user.schoolId).order("sort_order").order("name"),
    db.from("sections").select("id,name").eq("school_id", user.schoolId).order("name"),
    getLibrariansTeam()
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);

  const rawSettings = settingsResult.data as any;
  const settings: LibrarySettings = {
    loan_days: rawSettings.loan_days ?? 14,
    max_loans: rawSettings.max_loans ?? 3,
    max_renewals: rawSettings.max_renewals ?? 2,
    fine_per_day: rawSettings.fine_per_day ?? 0,
    student_loan_days: rawSettings.student_loan_days ?? rawSettings.loan_days ?? 14,
    student_max_loans: rawSettings.student_max_loans ?? rawSettings.max_loans ?? 3,
    student_max_renewals: rawSettings.student_max_renewals ?? rawSettings.max_renewals ?? 2,
    student_renewal_days: rawSettings.student_renewal_days ?? rawSettings.loan_days ?? 14,
    staff_loan_days: rawSettings.staff_loan_days ?? 30,
    staff_max_loans: rawSettings.staff_max_loans ?? 5,
    staff_max_renewals: rawSettings.staff_max_renewals ?? 3,
    staff_renewal_days: rawSettings.staff_renewal_days ?? 30,
  };

  return {
    books,
    copies,
    loans,
    reservations,
    settings,
    borrowers,
    events: (events.data ?? []) as LibraryEvent[],
    grades: (grades.data ?? []) as LibraryGrade[],
    sections: (sections.data ?? []) as LibrarySection[],
    team
  };
}

export type LibraryData = Awaited<ReturnType<typeof getLibrary>>;

export async function searchBorrowers(
  user: AppUser,
  kind: "student" | "staff",
  query: string,
  gradeId?: string | null,
  sectionId?: string | null,
  limit = 20
): Promise<SearchResultBorrower[]> {
  if (!hasPermission(user.role, "library:view", user.permissions)) throw new Error("Library access denied");
  const db = await createClient();

  const { data, error } = await db.rpc("library_borrowers_search", {
    p_school_id: user.schoolId,
    p_kind: kind,
    p_query: query,
    p_grade_id: gradeId || null,
    p_section_id: sectionId || null,
    p_limit: limit
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return [];
    throw new Error(error.message);
  }

  return (data ?? []) as SearchResultBorrower[];
}

export async function searchCopies(
  user: AppUser,
  query: string,
  borrowerKind?: string | null,
  borrowerId?: string | null,
  limit = 20
): Promise<SearchResultCopy[]> {
  if (!hasPermission(user.role, "library:view", user.permissions)) throw new Error("Library access denied");
  const db = await createClient();

  const { data, error } = await db.rpc("library_copies_search", {
    p_school_id: user.schoolId,
    p_query: query,
    p_borrower_kind: borrowerKind || null,
    p_borrower_id: borrowerId || null,
    p_limit: limit
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return [];
    throw new Error(error.message);
  }

  return (data ?? []) as SearchResultCopy[];
}

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
