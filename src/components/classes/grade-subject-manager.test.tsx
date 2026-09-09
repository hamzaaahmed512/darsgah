import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GradeSubjectManager } from "./grade-subject-manager";
import { addGradeSubjectAction } from "@/app/(app)/classes/actions";
import { getActiveGradeNames } from "./add-grade-modal";

const { refresh, pushToast } = vi.hoisted(() => ({ refresh: vi.fn(), pushToast: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ pushToast }) }));
vi.mock("@/app/(app)/classes/actions", () => ({
  addGradeSubjectAction: vi.fn(),
  removeGradeSubjectAction: vi.fn()
}));
beforeEach(() => vi.stubGlobal("React", React));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("grade recovery and subject choices", () => {
  it("treats only grades with a remaining section as already added", () => {
    expect(getActiveGradeNames([
      { grade_name: "Grade 8", academic_year_id: "current" },
      { grade_name: "Grade 9", academic_year_id: "previous" }
    ], "current")).toEqual(["Grade 8"]);
    expect(getActiveGradeNames([], "current")).not.toContain("Grade 9");
  });

  it("shows removed defaults and catalog subjects as unchecked choices", () => {
    render(<GradeSubjectManager gradeId="00000000-0000-0000-0000-000000000001" gradeName="Grade 1"
      availableSubjects={[{ id: "subject-art", name: "Art" }]} linkedSubjectIds={[]} />);

    expect((screen.getByRole("checkbox", { name: "English" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Art" }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByPlaceholderText("Create a new subject")).toBeTruthy();
  });

  it("adds a missing default by name and an existing subject by ID", async () => {
    vi.mocked(addGradeSubjectAction).mockResolvedValue(undefined);
    render(<GradeSubjectManager gradeId="00000000-0000-0000-0000-000000000001" gradeName="Grade 1"
      availableSubjects={[{ id: "subject-art", name: "Art" }]} linkedSubjectIds={[]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    await waitFor(() => expect(addGradeSubjectAction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(addGradeSubjectAction).mock.calls[0][0].get("name")).toBe("English");

    fireEvent.click(screen.getByRole("checkbox", { name: "Art" }));
    await waitFor(() => expect(addGradeSubjectAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(addGradeSubjectAction).mock.calls[1][0].get("subject_id")).toBe("subject-art");
  });
});
