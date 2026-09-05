import { describe, expect, it } from "vitest";
import { findNextUnpaidPayrollMonth } from "@/lib/services/payroll";

describe("findNextUnpaidPayrollMonth", () => {
  it("prefers the next unpaid payroll after the adjustment date", () => {
    const months = [
      { month: "2026-08", status: "paid" },
      { month: "2026-09", status: "generated" },
      { month: "2026-10", status: "generated" }
    ];

    expect(findNextUnpaidPayrollMonth(months, "2026-09-12")).toBe("2026-09");
    expect(findNextUnpaidPayrollMonth(months, "2026-10-03")).toBe("2026-10");
  });

  it("returns null when no payable payroll remains after the adjustment date", () => {
    const months = [
      { month: "2026-08", status: "paid" },
      { month: "2026-09", status: "paid" }
    ];

    expect(findNextUnpaidPayrollMonth(months, "2026-09-22")).toBeNull();
  });
});
