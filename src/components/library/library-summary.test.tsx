import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { LibrarySummary } from "./library-summary";
import type { LibraryData } from "@/lib/services/library";
vi.stubGlobal("React", React);
vi.mock("@/lib/validation/library", () => ({ libraryToday: () => "2026-09-24" }));
afterEach(cleanup);
const book = { id: "book", title: "Science", author: "Author", isbn: "", category: "", publisher: "", shelf: "", archived: false, default_replacement_cost: null };
const loan = { id: "loan", copy_id: "copy", borrower_name: "Ali", borrower_kind: "student", borrower_id: "student", issued_at: "2026-09-01", due_date: "2026-09-23", returned_at: null, outcome: null, renewals: 0, fine_per_day: 0, fine_amount: 0, paid_amount: 0, waived_amount: 0 };
const reservation = { id: "reservation", book_id: "book", borrower_kind: "student", borrower_id: "student", borrower_name: "Ali", status: "waiting", created_at: "2026-09-01" };
const data: Pick<LibraryData, "books" | "copies" | "loans" | "reservations"> = {
  books: [book, { ...book, id: "uncopied-title" }],
  copies: [{ id: "copy", book_id: "book", accession: "001", status: "on_loan", replacement_cost: null }],
  loans: [loan, { ...loan, id: "returned", returned_at: "2026-09-22" }, { ...loan, id: "due-today", due_date: "2026-09-24" }],
  reservations: [reservation, { ...reservation, id: "cancelled", status: "cancelled" }]
};
function expectMetric(label: string, value: string) {
  expect(within(screen.getByRole("group", { name: label })).getByText(value)).toBeTruthy();
}
describe("library report totals", () => {
  it("updates from refreshed data after adding books, returning loans, and fulfilling reservations", () => {
    const { rerender } = render(<LibrarySummary data={data} />);
    expectMetric("Total Books", "1");
    expect(screen.getByText("Across 2 titles")).toBeTruthy();
    expectMetric("On Loan", "2");
    expectMetric("Overdue Loans", "1");
    expectMetric("Reservations / Waiting List", "1");
    rerender(<LibrarySummary data={{ ...data,
      books: [...data.books, { ...book, id: "new-book" }],
      copies: [...data.copies, { ...data.copies[0], id: "new-copy", book_id: "new-book" }],
      loans: data.loans.map(item => ({ ...item, returned_at: "2026-09-24" })),
      reservations: data.reservations.map(item => ({ ...item, status: "fulfilled" }))
    }} />);
    expectMetric("Total Books", "2");
    expect(screen.getByText("Across 3 titles")).toBeTruthy();
    expectMetric("On Loan", "0");
    expectMetric("Overdue Loans", "0");
    expectMetric("Reservations / Waiting List", "0");
  });
  it("shows a stable loading grid until data is available, then displays real zero totals", () => {
    const { rerender } = render(<LibrarySummary />);
    expect(screen.getByRole("status").textContent).toBe("Loading library totals...");
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.queryByText("0")).toBeNull();
    rerender(<LibrarySummary data={{ books: [], copies: [], loans: [], reservations: [] }} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
