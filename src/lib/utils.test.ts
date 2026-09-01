import { describe, expect, it } from "vitest";
import { formatClassDisplayName, formatCompactNumber, formatCompactPKR, formatGradeSection, initials, toCsv } from "@/lib/utils";
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

  it("formats compact chart values with readable suffixes", () => {
    expect(formatCompactPKR(500)).toBe("Rs 500");
    expect(formatCompactPKR(1_000)).toBe("Rs 1K");
    expect(formatCompactPKR(140_000)).toBe("Rs 140K");
    expect(formatCompactPKR(110_313_877)).toBe("Rs 110.3M");
    expect(formatCompactPKR(2_500_000_000)).toBe("Rs 2.5B");
    expect(formatCompactNumber(15_500)).toBe("15.5K");
  });

  it("formats grade and section without duplicated labels", () => {
    expect(formatGradeSection("Grade 9", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("Grade 9 orange", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("Grade 9", "Section Orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("Grade 9", "Grade 9 orange - orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("Grade 9", "orange - orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("Grade 9 - Grade 9", "Orange")).toBe("GRADE 9 - ORANGE");
    expect(formatGradeSection("9", "a")).toBe("GRADE 9 - A");
    expect(formatGradeSection("Grade 9", null)).toBe("GRADE 9");
    expect(formatGradeSection(null, "Orange")).toBe("ORANGE");
  });

  it("formats class labels without repeating grade and section", () => {
    expect(formatClassDisplayName("Grade 9", "Grade 9 orange", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "Grade 9 orange", null)).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Grade 9 orange - orange", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "orange", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "Grade 9", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Orange", "orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "9A", "A")).toBe("GRADE 9 - A");
    expect(formatClassDisplayName("Grade 9", "Morning", "Orange")).toBe("GRADE 9 - ORANGE");
    expect(formatClassDisplayName("Grade 9", "Grade 9 - Orange - Morning", "Orange")).toBe("GRADE 9 - ORANGE");
  });
});
