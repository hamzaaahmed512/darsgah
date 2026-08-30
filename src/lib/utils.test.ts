import { describe, expect, it } from "vitest";
import { formatClassDisplayName, formatGradeSection, initials, toCsv } from "@/lib/utils";
import { calculateGrade, percentage } from "@/lib/grades";

describe("utilities", () => {
  it("builds initials from display names", () => {
    expect(initials("Jane Doe")).toBe("JD");
    expect(initials("Miles")).toBe("M");
  });

  it("exports csv with escaped quotes", () => {
    expect(toCsv([{ name: 'Alex "A"', status: "active" }])).toContain('"Alex ""A"""');
  });

  it("calculates percentages and grades", () => {
    expect(percentage(45, 50)).toBe(90);
    expect(calculateGrade(45, 50)).toBe("A+");
    expect(calculateGrade(32, 50)).toBe("C");
  });

  it("formats grade and section without duplicated labels", () => {
    expect(formatGradeSection("Grade 9", "orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("Grade 9 orange", "orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("Grade 9", "Section Orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("Grade 9", "Grade 9 orange - orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("Grade 9", "orange - orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("Grade 9 - Grade 9", "Orange")).toBe("Grade 9 - Orange");
    expect(formatGradeSection("9", "a")).toBe("Grade 9 - A");
    expect(formatGradeSection("Grade 9", null)).toBe("Grade 9");
    expect(formatGradeSection(null, "Orange")).toBe("Orange");
  });

  it("formats class labels without repeating grade and section", () => {
    expect(formatClassDisplayName("Grade 9", "Grade 9 orange", "orange")).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "Grade 9 orange", null)).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Grade 9 orange - orange", "orange")).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "orange", "orange")).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "Grade 9", "orange")).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Orange", "orange")).toBe("Grade 9 - Orange");
    expect(formatClassDisplayName("Grade 9", "Morning", "Orange")).toBe("Grade 9 - Orange - Morning");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Orange - Morning", "Orange")).toBe("Grade 9 - Orange - Morning");
  });
});
