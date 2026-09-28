import { describe, expect, it } from "vitest";
import { paginateRows } from "@/lib/pagination";

describe("paginateRows", () => {
  const rows = Array.from({ length: 26 }, (_, index) => index + 1);

  it("returns the requested page and preserves the full count", () => {
    expect(paginateRows(rows, 2, 10)).toEqual({ rows: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], count: 26, page: 2, pageSize: 10 });
  });

  it("clamps invalid pages and page sizes", () => {
    expect(paginateRows(rows, 99, 12)).toEqual({ rows: [21, 22, 23, 24, 25, 26], count: 26, page: 3, pageSize: 10 });
  });
});
