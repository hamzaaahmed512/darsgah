import { describe, expect, it } from "vitest";
import { aggregateClassDistributionByGrade } from "@/lib/grade-distribution";

describe("aggregateClassDistributionByGrade", () => {
  it("combines section counts into one naturally ordered bar per grade", () => {
    expect(aggregateClassDistributionByGrade([
      { class_name: "Grade 10 - A", grade_name: "Grade 10", student_count: 24 },
      { class_name: "Grade 8 - A", grade_name: "Grade 8", student_count: 30 },
      { class_name: "Grade 8 - B", grade_name: "Grade 8", student_count: 28 },
      { class_name: "Grade 9 - A", grade_name: "Grade 9", student_count: 35 },
      { class_name: "Grade 10 - B", grade_name: "Grade 10", student_count: 21 }
    ])).toEqual([
      { class_name: "Grade 8", student_count: 58 },
      { class_name: "Grade 9", student_count: 35 },
      { class_name: "Grade 10", student_count: 45 }
    ]);
  });
});
