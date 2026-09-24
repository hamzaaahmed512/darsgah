import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LibraryWorkspace } from "./library-workspace";
import type { LibraryData } from "@/lib/services/library";

const { save, refresh, searchBorrowers, searchCopies } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn(), searchBorrowers: vi.fn().mockResolvedValue([]), searchCopies: vi.fn().mockResolvedValue([]) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/library/actions", () => ({
  libraryAction: save,
  libraryAssignableStaffAction: vi.fn().mockResolvedValue({ staff: [] }),
  libraryTeamRoleAction: vi.fn(),
  searchBorrowersAction: searchBorrowers,
  searchCopiesAction: searchCopies
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ pushToast: vi.fn() }) }));

vi.stubGlobal("React", React);

const data: LibraryData = {
  books: [{ id: "book", title: "School Science", author: "Test Author", isbn: "1234", shelf: "A1", category: "Science", publisher: "Press", archived: false, default_replacement_cost: 500 }],
  copies: [
    { id: "copy", book_id: "book", accession: "LIB-001", status: "available", replacement_cost: 500 },
    { id: "copy2", book_id: "book", accession: "LIB-002", status: "on_loan", replacement_cost: null },
  ],
  borrowers: [{ id: "student", kind: "student", name: "Ali Test", reference: "S-001" }],
  loans: [],
  reservations: [],
  events: [],
  settings: {
    loan_days: 14, max_loans: 3, max_renewals: 2, fine_per_day: 10,
    student_loan_days: 14, student_max_loans: 3, student_max_renewals: 2, student_renewal_days: 14,
    staff_loan_days: 30, staff_max_loans: 5, staff_max_renewals: 3, staff_renewal_days: 30
  },
  grades: [],
  sections: [],
  team: []
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("library workspace", () => {
  it("issues from the catalogue without a reservation", async () => {
    searchBorrowers.mockResolvedValue([{ id: "student", kind: "student", name: "Ali Test", reference: "S-001", grade_name: "7", section_name: "A", is_eligible: true, active_loans_count: 0, max_loans_allowed: 3 }]);
    searchCopies.mockResolvedValue([{ id: "copy", book_id: "book", book_title: "School Science", accession: "LIB-001", shelf: "A1", status: "available", is_eligible: true }]);
    save.mockResolvedValue({ ok: true });
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getAllByRole("button", { name: "Issue Book" })[0]);
    const borrowerSearch = screen.getByPlaceholderText(/Search by student name/);
    fireEvent.focus(borrowerSearch);
    fireEvent.click(await screen.findByRole("button", { name: /Ali Test.*Eligible/ }));
    const submit = screen.getByRole("button", { name: "Issue book" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.submit(submit.closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const payload = save.mock.calls[0][0] as FormData;
    expect(payload.get("borrower_id")).toBe("student");
    expect(payload.get("copy_id")).toBe("copy");
    expect(payload.get("reservation_id")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Change borrower" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull();
  });

  it("limits an issue due date to the configured borrower policy", () => {
    render(<LibraryWorkspace data={{ ...data, settings: { ...data.settings, student_loan_days: 21 } }} canManage canAdmin />);
    fireEvent.click(screen.getAllByRole("button", { name: "Issue Book" })[0]);
    const dueDate = document.querySelector("input[name='due_date']") as HTMLInputElement;
    expect(dueDate.max).toBeTruthy();
    expect(dueDate.value).toBe(dueDate.max);
  });

  it("closes the issue dialog with Escape", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getAllByRole("button", { name: "Issue Book" })[0]);
    expect(screen.getByRole("dialog", { name: "Issue book" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Issue book" })).toBeNull();
  });

  it("opens the library roster from the single Manage team entry", async () => {
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Manage team" }));
    expect(screen.getByText("Assigned Librarians")).toBeTruthy();
    expect(screen.getByLabelText("Saved borrowing rules")).toBeTruthy();
    expect(screen.getByLabelText("Assign New Librarian")).toBeTruthy();
    expect(screen.getByText("No librarians currently assigned.")).toBeTruthy();
    await screen.findByText("No eligible active staff members available.");
  });
  it("shows catalogue search and hides writes for a viewer", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getAllByText("School Science").length).toBeGreaterThan(0);
    expect(screen.queryByText("Add a book")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search catalogue"), { target: { value: "missing" } });
    expect(screen.getByText("No books found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Loans & reservations/ }));
    expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull();
  });

  it("displays each title's total copy count", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    const bookRow = screen.getByRole("row", { name: /School Science/ });
    expect(within(bookRow).getByText("2")).toBeTruthy();
  });

  it("links each catalogue title to its copy inventory", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getAllByRole("link", { name: "View copies" })[0].getAttribute("href")).toBe("/library/book");
  });

  it("KPI Total books counts copies and shows title count subtitle", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("Total books")).toBeTruthy();
    expect(screen.getByText("Across 1 title")).toBeTruthy();
  });

  it("totals copies across every title and opens overdue loans from the metric", () => {
    const otherBook = { ...data.books[0], id: "other", title: "Second Title" };
    render(<LibraryWorkspace data={{ ...data, books: [...data.books, otherBook], copies: [...data.copies, { ...data.copies[0], id: "other-copy", book_id: "other" }] }} canManage={false} canAdmin={false} />);
    const totalCard = screen.getByRole("button", { name: /Total books/ });
    expect(within(totalCard).getByText("3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Overdue loans/ }));
    expect((screen.getByLabelText("Loan status") as HTMLSelectElement).value).toBe("overdue");
  });

  it("keeps catalogue issue disabled until a borrower is selected", async () => {
    save.mockResolvedValue({ error: "This copy is no longer available" });
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Issue Book" })[0]);

    const forms = document.querySelectorAll("form");
    const issueForm = Array.from(forms).find(f => (f as HTMLFormElement).querySelector("input[name='action'][value='issue']"));
    expect(issueForm).toBeTruthy();

    if (issueForm) {
      expect((issueForm.querySelector("button[type='submit']") as HTMLButtonElement).disabled).toBe(true);
      fireEvent.submit(issueForm);
      expect(save).not.toHaveBeenCalled();
    }
  });

  it("shows borrowing rules as read only for librarians", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Rules & team/ }));
    expect(screen.getByText(/Loan period: 14 days/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save borrowing rules" })).toBeNull();
  });

  it("lets principals save policy and refresh after success", async () => {
    save.mockResolvedValue({ ok: true });
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Rules & team/ }));
    const loanDaysInput = screen.getAllByLabelText(/Loan period/)[0];
    fireEvent.change(loanDaysInput, { target: { value: "21" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save borrowing rules" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows reservation waiting-request policy note", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Loans & reservations/ }));
    expect(screen.getByText(/waiting-list requests/)).toBeTruthy();
  });

  it("opens the catalogue issue dialog for a ready reservation", async () => {
    save.mockResolvedValue({ ok: true });
    Element.prototype.scrollIntoView = vi.fn();
    const dataWithReservations: LibraryData = {
      ...data,
      reservations: [
        {
          id: "res1",
          book_id: "book",
          book_title: "School Science",
          borrower_id: "student",
          borrower_kind: "student",
          borrower_name: "Ali Test",
          created_at: "2026-09-01T10:00:00Z",
          status: "waiting",
          grade_name: "Grade 7",
          section_name: "A",
          registration_number: "REG-101",
          available_copies: 1,
          queue_position: 1,
          is_ready_to_issue: true
        }
      ]
    };

    render(<LibraryWorkspace data={dataWithReservations} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Loans & reservations/ }));
    expect(screen.getByText("Waiting queue management")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Select for issue/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /Select for issue/ })[0]);
    expect(screen.getByLabelText("Search catalogue")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Issue book" })).toHaveLength(1);
    fireEvent.submit(screen.getByRole("button", { name: "Issue book" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const payload = save.mock.calls[0][0] as FormData;
    expect(payload.get("reservation_id")).toBe("res1");
    expect(payload.get("borrower_id")).toBe("student");
    expect(payload.get("copy_id")).toBe("copy");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull());
  });

  it("shows ready to issue badge and cancel option in reservations tab", () => {
    const dataWithReservations: LibraryData = {
      ...data,
      reservations: [
        {
          id: "res1",
          book_id: "book",
          borrower_id: "student",
          borrower_kind: "student",
          borrower_name: "Ali Test",
          created_at: "2026-09-01T10:00:00Z",
          status: "waiting",
          available_copies: 1,
          queue_position: 1,
          is_ready_to_issue: true
        }
      ]
    };

    render(<LibraryWorkspace data={dataWithReservations} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Loans & reservations/ }));
    expect(screen.getAllByText("Ready to issue").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Cancel reservation" }).length).toBeGreaterThan(0);
  });

  it("renders unified reports with a single summary, collapsed filters, and export menu", () => {
    render(<LibraryWorkspace data={{ ...data, grades: [{ id: "g9", name: "9", sort_order: 9 }, { id: "g10", name: "Grade 10", sort_order: 10 }, { id: "bad", name: "Ali Test", sort_order: 11 }] }} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Reports/ }));

    expect(screen.getByText("Library reports")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Current library totals" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Total Books" }).textContent).toContain("Across 1 title");
    expect(screen.getByRole("group", { name: "Reservations / Waiting List" })).toBeTruthy();
    expect(screen.getByText("Inventory copy status breakdown")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Total books/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "Report type" })).toBeNull();
    expect(screen.getByText("Filter reports").closest("details")!.open).toBe(false);
    const grades = within(screen.getByLabelText("Filter by grade"));
    expect(grades.getByRole("option", { name: "Grade 9" })).toBeTruthy();
    expect(grades.getByRole("option", { name: "Grade 10" })).toBeTruthy();
    expect(grades.queryByRole("option", { name: "Ali Test" })).toBeNull();
    expect(screen.getByText("Circulation Insights")).toBeTruthy();
    expect(screen.getByText("Fines summary")).toBeTruthy();
    const exports = screen.getByText("Export Report").closest("details")!;
    expect(exports.open).toBe(false);
    exports.open = true;
    for (const name of ["Inventory", "Loan History", "Overdue Loans", "Reservations", "Fines", "Audit Activity"]) {
      expect(within(exports).getByRole("button", { name })).toBeTruthy();
    }
    fireEvent.keyDown(exports, { key: "Escape" });
    expect(exports.open).toBe(false);
  });
});
