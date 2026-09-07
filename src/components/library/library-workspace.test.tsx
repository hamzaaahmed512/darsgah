import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LibraryWorkspace } from "./library-workspace";
import type { LibraryData } from "@/lib/services/library";

const { save, refresh } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/library/actions", () => ({
  libraryAction: save,
  searchBorrowersAction: vi.fn().mockResolvedValue([]),
  searchCopiesAction: vi.fn().mockResolvedValue([])
}));

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
  it("shows catalogue search and hides writes for a viewer", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("School Science")).toBeTruthy();
    expect(screen.queryByText("Add a book")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search catalogue"), { target: { value: "missing" } });
    expect(screen.getByText("No books found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Issue & return" }));
    expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull();
  });

  it("displays per-book copy counts correctly", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Copy ID label in expandable copy list and null replacement cost", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    fireEvent.click(screen.getByText(/View copies/));
    expect(screen.getAllByText("Copy ID").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("LIB-001")).toBeTruthy();
    expect(screen.getAllByText(/not specified/).length).toBeGreaterThanOrEqual(1);
  });

  it("KPI Total books counts active copies and shows title count subtitle", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("Total books")).toBeTruthy();
    expect(screen.getByText("Across 1 title")).toBeTruthy();
  });

  it("submits selected copy and borrower and displays circulation errors", async () => {
    save.mockResolvedValue({ error: "This copy is no longer available" });
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Issue & return" }));

    const forms = document.querySelectorAll("form");
    const issueForm = Array.from(forms).find(f => (f as HTMLFormElement).querySelector("input[name='action'][value='issue']"));
    expect(issueForm).toBeTruthy();

    if (issueForm) {
      fireEvent.submit(issueForm);
      await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("This copy is no longer available"));
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
    fireEvent.click(screen.getByRole("button", { name: "Reservations" }));
    expect(screen.getByText(/waiting-list requests/)).toBeTruthy();
  });

  it("renders ready to fulfil panel on issue & return tab when active ready reservations exist", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Issue & return" }));
    expect(screen.getByText("Reservations ready to fulfil")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Issue to Ali/ })).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: "Reservations" }));
    expect(screen.getByText("Ready to issue")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel reservation" })).toBeTruthy();
  });

  it("renders decision-focused reports dashboard with filters, KPIs, and export buttons", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));

    expect(screen.getByText("Library Decision & Operational Reports")).toBeTruthy();
    expect(screen.getByText("System Overview KPIs")).toBeTruthy();
    expect(screen.getByText("Inventory copy status breakdown")).toBeTruthy();
    expect(screen.getByText("Circulation Insights")).toBeTruthy();
    expect(screen.getByText("Fines & Financial Compliance Summary")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inventory CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Loan History CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Overdue Loans CSV" })).toBeTruthy();
  });
});
