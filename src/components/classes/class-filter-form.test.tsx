import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClassFilterForm } from "./class-filter-form";

const { replace, params } = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams("grade=grade-9&classId=class-9-a")
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/classes",
  useSearchParams: () => params
}));
beforeEach(() => vi.stubGlobal("React", React));

const grades = [{ id: "grade-9", name: "Grade 9" }, { id: "grade-10", name: "Grade 10" }];
const classes = [
  { id: "class-9-a", name: "Grade 9 A", grade_id: "grade-9", grade_name: "Grade 9", section_name: "A" },
  { id: "class-9-b", name: "Grade 9 B", grade_id: "grade-9", grade_name: "Grade 9", section_name: "B" },
  { id: "class-10-a", name: "Grade 10 A", grade_id: "grade-10", grade_name: "Grade 10", section_name: "A" }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ClassFilterForm", () => {
  it("uses separate grade and section choices", () => {
    render(<ClassFilterForm grades={grades} classes={classes} />);

    const grade = screen.getByLabelText("Grade") as HTMLSelectElement;
    const section = screen.getByLabelText("Section") as HTMLSelectElement;
    expect(grade.value).toBe("grade-9");
    expect([...section.options].map((option) => option.text)).toEqual([
      "Select section (all)", "GRADE 9 - A", "GRADE 9 - B"
    ]);
  });

  it("clears the old section when the grade changes", () => {
    render(<ClassFilterForm grades={grades} classes={classes} />);

    fireEvent.change(screen.getByLabelText("Grade"), { target: { value: "grade-10" } });

    expect(replace).toHaveBeenCalledWith("/classes?grade=grade-10");
  });
});
