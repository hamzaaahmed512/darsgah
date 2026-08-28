import { describe, expect, it } from "vitest";
import { defaultCombinationOptionsForGrade, isCustomStudentMajor, isSubjectExcludedForMajor, majorsForGrade, studentMajorLabel } from "@/lib/student-majors";

describe("student major subject rules", () => {
  it("offers the correct majors for secondary grades", () => {
    expect(majorsForGrade("Grade 9")).toEqual(["computer", "biology"]);
    expect(majorsForGrade("Grade 12")).toContain("computer_economics_stats");
    expect(majorsForGrade("Grade 8")).toEqual([]);
  });

  it("applies Grade 9 and 10 exclusions case-insensitively", () => {
    expect(isSubjectExcludedForMajor("Grade 9", "computer", "BIOLOGY")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Computer Science")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Physics")).toBe(false);
  });

  it("applies Grade 11 and 12 study-group rules", () => {
    expect(isSubjectExcludedForMajor("Grade 11", "computer", "Chemistry")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 11", "pre_engineering", "Biology")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 12", "biology", "Mathematics")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 12", "computer_economics_stats", "Physics")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 12", "computer_economics_stats", "Statistics")).toBe(false);
  });

  it("supports custom combinations as major options", () => {
    const custom = { value: "custom:11111111-1111-1111-1111-111111111111" as const, label: "Arts with Computer", kind: "custom" as const };

    expect(defaultCombinationOptionsForGrade("Grade 9").map((option) => option.value)).toEqual(["computer", "biology"]);
    expect(isCustomStudentMajor(custom.value)).toBe(true);
    expect(studentMajorLabel(custom.value, [custom])).toBe("Arts with Computer");
    expect(isSubjectExcludedForMajor("Grade 10", custom.value, "Biology")).toBe(false);
  });
});
