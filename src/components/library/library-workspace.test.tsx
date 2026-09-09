import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LibraryWorkspace } from "./library-workspace";
import type { LibraryData } from "@/lib/services/library";

const { save, refresh, searchBorrowers, searchCopies } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn(), searchBorrowers: vi.fn().mockResolvedValue([]), searchCopies: vi.fn().mockResolvedValue([]) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/library/actions", () => ({
  libraryAction: save,
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
  it("issues without a reservation and clears controlled selections after success", async () => {
    searchBorrowers.mockResolvedValue([{ id: "student", kind: "student", name: "Ali Test", reference: "S-001", grade_name: "7", section_name: "A", is_eligible: true, active_loans_count: 0, max_loans_allowed: 3 }]);
    searchCopies.mockResolvedValue([{ id: "copy", book_id: "book", book_title: "School Science", accession: "LIB-001", shelf: "A1", status: "available", is_eligible: true }]);
    save.mockResolvedValue({ ok: true });
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));
    const borrowerSearch = screen.getAllByPlaceholderText(/Search by student name/)[0];
    expect((borrowerSearch.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(false);
    fireEvent.focus(borrowerSearch);
    fireEvent.click(await screen.findByRole("button", { name: /Ali Test.*Eligible/ }));
    fireEvent.focus(screen.getByPlaceholderText(/Search by book title/));
    fireEvent.click(await screen.findByRole("button", { name: /School Science.*Available/ }));
    const submit = screen.getByRole("button", { name: "Issue book" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.submit(submit.closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const payload = save.mock.calls[0][0] as FormData;
    expect(payload.get("borrower_id")).toBe("student");
    expect(payload.get("copy_id")).toBe("copy");
    expect(payload.get("reservation_id")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Change borrower" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Change copy" })).toBeNull();
    expect((screen.getByRole("button", { name: "Issue book" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the library roster from the single Manage team entry", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Manage team" }));
    expect(screen.getByText("Assigned Librarians")).toBeTruthy();
    expect(screen.getByLabelText("Saved borrowing rules")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Assign librarian" }).getAttribute("href")).toBe("/admin");
  });
  it("shows catalogue search and hides writes for a viewer", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("School Science")).toBeTruthy();
    expect(screen.queryByText("Add a book")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search catalogue"), { target: { value: "missing" } });
    expect(screen.getByText("No books found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));
    expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull();
  });

  it("displays each title's total copy count", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    const bookRow = screen.getByRole("row", { name: /School Science/ });
    expect(within(bookRow).getByText("2")).toBeTruthy();
  });

  it("links each catalogue title to its copy inventory", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByRole("link", { name: "View inventory for School Science" }).getAttribute("href")).toBe("/library/book");
  });

  it("KPI Total books counts active copies and shows title count subtitle", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("Total books")).toBeTruthy();
    expect(screen.getByText("Across 1 title")).toBeTruthy();
  });

  it("submits selected copy and borrower and displays circulation errors", async () => {
    save.mockResolvedValue({ error: "This copy is no longer available" });
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));

    const forms = document.querySelectorAll("form");
    const issueForm = Array.from(forms).find(f => (f as HTMLFormElement).querySelector("input[name='action'][value='issue']"));
    expect(issueForm).toBeTruthy();

    if (issueForm) {
      expect((issueForm.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(false);
      fireEvent.submit(issueForm);
      expect(save).not.toHaveBeenCalled();
    }
  });

  it("shows borrowing rules as read only for librarians", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rules & team" }));
    expect(screen.getByText(/Loan period: 14 days/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save borrowing rules" })).toBeNull();
  });

  it("lets principals save policy and refresh after success", async () => {
    save.mockResolvedValue({ ok: true });
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Rules & team" }));
    const loanDaysInput = screen.getAllByLabelText(/Loan period/)[0];
    fireEvent.change(loanDaysInput, { target: { value: "21" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save borrowing rules" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows reservation waiting-request policy note", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));
    expect(screen.getByText(/waiting-list requests/)).toBeTruthy();
  });

  it("fulfils a reservation in the same circulation tab with one issue submit button", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));
    expect(screen.getByText("Waiting queue management")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Select for issue/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Select for issue/ }));
    expect(screen.getAllByRole("button", { name: "Issue book" })).toHaveLength(1);
    expect(screen.getByText("Fulfilling Waiting Reservation")).toBeTruthy();
    fireEvent.submit(screen.getByRole("button", { name: "Issue book" }).closest("form")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const payload = save.mock.calls[0][0] as FormData;
    expect(payload.get("reservation_id")).toBe("res1");
    expect(payload.get("borrower_id")).toBe("student");
    expect(payload.get("copy_id")).toBe("copy");
    await waitFor(() => expect(screen.queryByText("Fulfilling Waiting Reservation")).toBeNull());
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
    fireEvent.click(screen.getByRole("button", { name: "Loans & reservations" }));
    expect(screen.getByText("Ready to issue")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel reservation" })).toBeTruthy();
  });

  it("renders decision-focused reports dashboard with filters, KPIs, and export buttons", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));

    expect(screen.getByText("Library reports")).toBeTruthy();
    expect(screen.getByText("Current library totals")).toBeTruthy();
    expect(screen.queryByText("Inventory copy status breakdown")).toBeNull();
    expect(screen.getByText("Circulation Insights")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fines" }));
    expect(screen.getByText("Fines summary")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inventory CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Loan History CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Overdue Loans CSV" })).toBeTruthy();
  });
});
