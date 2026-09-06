import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LibraryWorkspace } from "./library-workspace";
import type { LibraryData } from "@/lib/services/library";

const { save, refresh } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/(app)/library/actions", () => ({ libraryAction: save }));
// The existing Vite config uses the classic JSX runtime for TSX modules.
vi.stubGlobal("React", React);
const data: LibraryData = {
  books: [{ id: "book", title: "School Science", author: "Test Author", isbn: "1234", shelf: "A1", category: "Science", publisher: "Press", archived: false }],
  copies: [{ id: "copy", book_id: "book", accession: "LIB-001", status: "available", replacement_cost: 500 }],
  borrowers: [{ id: "student", kind: "student", name: "Ali Test", reference: "S-001" }],
  loans: [], reservations: [], events: [], settings: { loan_days: 14, max_loans: 3, max_renewals: 2, fine_per_day: 10 }
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("library workspace", () => {
  it("shows catalogue search and hides writes for a viewer", () => {
    render(<LibraryWorkspace data={data} canManage={false} canAdmin={false} />);
    expect(screen.getByText("School Science")).toBeTruthy();
    expect(screen.queryByText("Add a book title")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search catalogue"), { target: { value: "missing" } });
    expect(screen.getByText("No books found")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Issue & return" }));
    expect(screen.queryByRole("button", { name: "Issue book" })).toBeNull();
  });
  it("submits selected copy and borrower and displays circulation errors", async () => {
    save.mockResolvedValue({ error: "This copy is no longer available" });
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Issue & return" }));
    fireEvent.change(screen.getByLabelText(/Available copy/), { target: { value: "copy" } });
    fireEvent.change(screen.getByLabelText(/Borrower/), { target: { value: "student:student" } });
    fireEvent.submit(screen.getByRole("button", { name: "Issue book" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("This copy is no longer available"));
    const payload = save.mock.calls[0][0] as FormData;
    expect(payload.get("action")).toBe("issue");
    expect(payload.get("copy_id")).toBe("copy");
    expect(payload.get("borrower")).toBe("student:student");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("shows borrowing rules as read only for librarians", () => {
    render(<LibraryWorkspace data={data} canManage canAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rules & team" }));
    expect(screen.getByText("Loan period: 14 days")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save borrowing rules" })).toBeNull();
  });
  it("lets principals save policy and refresh after success", async () => {
    save.mockResolvedValue({ ok: true });
    render(<LibraryWorkspace data={data} canManage canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Rules & team" }));
    fireEvent.change(screen.getByLabelText(/Loan period/), { target: { value: "21" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save borrowing rules" }).closest("form")!);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect((save.mock.calls[0][0] as FormData).get("loan_days")).toBe("21");
  });
});
