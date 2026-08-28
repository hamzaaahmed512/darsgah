import { describe, expect, it } from "vitest";
import { formatStudentName } from "@/lib/student-name";

describe("formatStudentName", () => {
  it("does not duplicate single-word student names", () => {
    expect(formatStudentName({ firstName: "Arslan", lastName: "Arslan" })).toBe("Arslan");
    expect(formatStudentName({ firstName: "Wahaj", lastName: "Wahaj" })).toBe("Wahaj");
  });

  it("keeps distinct first and last names", () => {
    expect(formatStudentName({ firstName: "Hamza", lastName: "Zahoor" })).toBe("Hamza Zahoor");
  });

  it("uses a provided display name first", () => {
    expect(formatStudentName({ firstName: "Arslan", lastName: "Arslan", name: "Arslan Khan" })).toBe("Arslan Khan");
  });
});
