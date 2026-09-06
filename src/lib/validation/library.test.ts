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
