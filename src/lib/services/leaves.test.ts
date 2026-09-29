import { describe, expect, it } from "vitest";
import { getDaysInRangeWithin } from "@/lib/services/leaves";

describe("leave reporting boundaries", () => {
  it("allocates a 29 December to 3 January leave to each reporting period", () => {
    expect(getDaysInRangeWithin("2025-12-29", "2026-01-03", "2025-01-01", "2025-12-31")).toBe(3);
    expect(getDaysInRangeWithin("2025-12-29", "2026-01-03", "2026-01-01", "2026-12-31")).toBe(3);
    expect(getDaysInRangeWithin("2025-12-29", "2026-01-03", "2025-12-01", "2025-12-31")).toBe(3);
    expect(getDaysInRangeWithin("2025-12-29", "2026-01-03", "2026-01-01", "2026-01-31")).toBe(3);
  });
});
