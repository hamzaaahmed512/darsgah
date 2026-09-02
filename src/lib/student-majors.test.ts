import { describe, expect, it } from "vitest";
import { canSelectStudentCombination, defaultCombinationOptionsForGrade, isCustomStudentMajor, isSubjectExcludedForMajor, majorsForGrade, normalizeStudentMajorValue, studentMajorLabel } from "@/lib/student-majors";
import { canonicalSubjectName, getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";

describe("student major subject rules", () => {
  it("offers grade-appropriate combinations from Grade 9 to Grade 12", () => {
    expect(majorsForGrade("Grade 9")).toEqual(["biology", "computer"]);
    expect(majorsForGrade("Grade 11")).toEqual(["biology", "computer", "pre_engineering"]);
    expect(majorsForGrade("Grade 12")).toEqual(["biology", "computer", "pre_engineering"]);
    expect(majorsForGrade("Grade 8")).toEqual([]);
    expect(canSelectStudentCombination("Grade 9")).toBe(true);
    expect(canSelectStudentCombination("Grade 11")).toBe(true);
    expect(canSelectStudentCombination("Grade 10")).toBe(true);
  });

  it("applies Grade 9 and 10 exclusions case-insensitively", () => {
    expect(isSubjectExcludedForMajor("Grade 9", "computer", "BIOLOGY")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Computer Science")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Physics")).toBe(false);
  });

  it("includes Pak Studies / Pak Study by default in Grade 10 without exclusions", () => {
    const grade10Defaults = getDefaultSubjectsForGrade("Grade 10").map((s) => s.name);
    expect(grade10Defaults).toContain("Pak Studies");
    expect(isSubjectExcludedForMajor("Grade 10", "computer", "Pak Studies")).toBe(false);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Pak Studies")).toBe(false);
    expect(isSubjectExcludedForMajor("Grade 10", "computer", "Pak Study")).toBe(false);
    expect(isSubjectExcludedForMajor("Grade 10", "biology", "Pak Study")).toBe(false);
  });

  it("includes Islamiat by default in Grade 9 without exclusions", () => {
    const grade9Defaults = getDefaultSubjectsForGrade("Grade 9").map((s) => s.name);
    expect(grade9Defaults).toContain("Islamiat");
    expect(isSubjectExcludedForMajor("Grade 9", "computer", "Islamiat")).toBe(false);
    expect(isSubjectExcludedForMajor("Grade 9", "biology", "Islamiat")).toBe(false);
  });

  it("normalizes Pak Study and Islamiat aliases in canonicalSubjectName to prevent duplicates", () => {
    expect(canonicalSubjectName("Pak Study")).toBe("pak studies");
    expect(canonicalSubjectName("Pak Studies")).toBe("pak studies");
    expect(canonicalSubjectName("Pakistan Studies")).toBe("pak studies");
    expect(canonicalSubjectName("Islamiyat")).toBe("islamiat");
    expect(canonicalSubjectName("Islamiat")).toBe("islamiat");
  });

  it("applies Grade 11 and 12 study-group rules", () => {
    expect(isSubjectExcludedForMajor("Grade 11", "computer", "Chemistry")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 11", "computer", "Biology")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 11", "computer", "Physics")).toBe(false);
    expect(isSubjectExcludedForMajor("Grade 11", "computer", "Statistics")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 11", "pre_engineering", "Biology")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 12", "biology", "Mathematics")).toBe(true);
    expect(isSubjectExcludedForMajor("Grade 12", "biology", "Physics")).toBe(false);
  });

  it("supports custom combinations as major options", () => {
    const custom = { value: "custom:11111111-1111-1111-1111-111111111111" as const, label: "Arts with Computer", kind: "custom" as const };

    expect(defaultCombinationOptionsForGrade("Grade 9")).toEqual([
      { value: "biology", label: "Biology", kind: "default" },
      { value: "computer", label: "Computer", kind: "default" }
    ]);
    expect(defaultCombinationOptionsForGrade("Grade 11")).toEqual([
      { value: "biology", label: "Pre-Medical", kind: "default" },
      { value: "computer", label: "ICS with Physics", kind: "default" },
      { value: "pre_engineering", label: "Pre-Engineering", kind: "default" }
    ]);
    expect(isCustomStudentMajor(custom.value)).toBe(true);
    expect(studentMajorLabel(custom.value, [custom])).toBe("Arts with Computer");
    expect(isSubjectExcludedForMajor("Grade 10", custom.value, "Biology")).toBe(false);
  });

  it("maps legacy labels to the canonical majors", () => {
    expect(normalizeStudentMajorValue("Biology")).toBe("biology");
    expect(studentMajorLabel("Computer")).toBe("ICS with Physics");
    expect(studentMajorLabel("biology")).toBe("Pre-Medical");
    expect(studentMajorLabel("pre_engineering")).toBe("Pre-Engineering");
  });
});
