import { describe, expect, it } from "vitest";
import { libraryActionSchema, libraryDueDate, libraryToday, overdueDays } from "./library";
import { hasPermission, roleHome } from "@/lib/permissions";

describe("library validation and dates", () => {
  it("uses the school date at the Pakistan midnight boundary", () => {
    expect(libraryToday(new Date("2026-09-06T19:01:00Z"))).toBe("2026-09-07");
    expect(overdueDays("2026-09-07", "2026-09-07")).toBe(0);
    expect(overdueDays("2026-09-05", "2026-09-07")).toBe(2);
    expect(overdueDays("2026-09-10", "2026-09-07")).toBe(0);
    expect(libraryDueDate(14, "2026-12-25")).toBe("2027-01-08");
  });
  it("rejects invalid borrower identifiers, dates, and money", () => {
    expect(libraryActionSchema.safeParse({ action: "issue", copy_id: "invalid", borrower_kind: "student", borrower_id: "invalid", due_date: "2026-02-30" }).success).toBe(false);
    for (const amount of [-1, 0, 1.123, Infinity]) {
      expect(libraryActionSchema.safeParse({ action: "payment", id: "11111111-1111-4111-8111-111111111111", amount }).success).toBe(false);
    }
    expect(libraryActionSchema.safeParse({ action: "payment", id: "11111111-1111-4111-8111-111111111111", amount: "15.50" }).success).toBe(true);
  });
  it("requires a waiver reason and bounded borrowing policies", () => {
    expect(libraryActionSchema.safeParse({ action: "waive", id: "11111111-1111-4111-8111-111111111111", amount: 10, reason: " " }).success).toBe(false);
    expect(libraryActionSchema.safeParse({ action: "settings", loan_days: 0, max_loans: 3, max_renewals: 2, fine_per_day: 0 }).success).toBe(false);
    expect(libraryActionSchema.safeParse({ action: "settings", loan_days: 14, max_loans: 3, max_renewals: 0, fine_per_day: 0 }).success).toBe(true);
  });

  // ── New schema additions ──────────────────────────────────────────────────
  it("accepts add_book_with_copies with a valid quantity", () => {
    const base = { action: "add_book_with_copies", title: "Test Book", quantity: 3 };
    expect(libraryActionSchema.safeParse(base).success).toBe(true);
  });
  it("rejects add_book_with_copies when quantity is out of bounds", () => {
    const base = { action: "add_book_with_copies", title: "Test Book" };
    expect(libraryActionSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(libraryActionSchema.safeParse({ ...base, quantity: 51 }).success).toBe(false);
    expect(libraryActionSchema.safeParse({ ...base, quantity: 1 }).success).toBe(true);
    expect(libraryActionSchema.safeParse({ ...base, quantity: 50 }).success).toBe(true);
  });
  it("accepts add_copies for an existing book", () => {
    expect(libraryActionSchema.safeParse({
      action: "add_copies",
      book_id: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
    }).success).toBe(true);
  });
  it("rejects add_copies when quantity is out of bounds", () => {
    const base = { action: "add_copies", book_id: "11111111-1111-4111-8111-111111111111" };
    expect(libraryActionSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(libraryActionSchema.safeParse({ ...base, quantity: 51 }).success).toBe(false);
  });
  it("treats empty replacement_cost as null (unknown), not Rs 0", () => {
    const result = libraryActionSchema.safeParse({ action: "add_copies", book_id: "11111111-1111-4111-8111-111111111111", quantity: 1, replacement_cost: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.replacement_cost).toBeNull();
  });
  it("accepts a numeric replacement_cost on add_copies", () => {
    const result = libraryActionSchema.safeParse({ action: "add_copies", book_id: "11111111-1111-4111-8111-111111111111", quantity: 2, replacement_cost: "850.00" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.replacement_cost).toBe(850);
  });
  it("accepts add_book_with_copies with optional author (empty is valid)", () => {
    expect(libraryActionSchema.safeParse({ action: "add_book_with_copies", title: "No Author Book", author: "", quantity: 1 }).success).toBe(true);
  });
  it("rejects add_book_with_copies when title is missing", () => {
    expect(libraryActionSchema.safeParse({ action: "add_book_with_copies", title: "", quantity: 1 }).success).toBe(false);
  });
});

describe("librarian access", () => {
  it("routes librarians to their workspace with limited permissions", () => {
    expect(roleHome("librarian")).toBe("/library");
    expect(hasPermission("librarian", "library:manage")).toBe(true);
    for (const permission of ["users:manage", "finance:manage", "students:update", "academics:manage", "settings:manage"] as const) expect(hasPermission("librarian", permission)).toBe(false);
    expect(hasPermission("principal", "library:manage")).toBe(true);
    expect(hasPermission("administrator", "library:manage")).toBe(true);
    expect(hasPermission("teacher", "library:manage")).toBe(false);
  });
  it("respects resolved permission overrides", () => {
    expect(hasPermission("librarian", "library:manage", ["library:view"])).toBe(false);
    expect(hasPermission("staff", "library:view", ["library:view"])).toBe(true);
  });
});
