import { describe, expect, it } from "vitest";
import { getActiveNavHref } from "./nav-items";

describe("getActiveNavHref", () => {
  it("selects the most specific matching navigation entry", () => {
    expect(getActiveNavHref("/academics/exams-setup", [
      "/academics",
      "/academics/exams-setup",
      "/academics/results"
    ])).toBe("/academics/exams-setup");
  });

  it("keeps a parent entry active for a detail route", () => {
    expect(getActiveNavHref("/students/student-1", ["/students", "/staff"])).toBe("/students");
  });
});
