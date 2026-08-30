import { describe, expect, it } from "vitest";
import { formatDisplayName, formatFullName, formatStudentName, splitFullName } from "@/lib/student-name";

describe("formatStudentName", () => {
  it("does not duplicate single-word student names", () => {
    expect(formatStudentName({ firstName: "Arslan", lastName: "Arslan" })).toBe("Arslan");
    expect(formatStudentName({ firstName: "Wahaj", lastName: "Wahaj" })).toBe("Wahaj");
  });

  it("keeps distinct first and last names", () => {
    expect(formatStudentName({ firstName: "Hamza", lastName: "Zahoor" })).toBe("Hamza Zahoor");
  });

  it("formats missing and duplicate last names globally", () => {
    expect(formatFullName("ALI", null)).toBe("ALI");
    expect(formatFullName("Amaz", "")).toBe("Amaz");
    expect(formatFullName("Arslan", "Arslan")).toBe("Arslan");
    expect(formatFullName(null, "Khan")).toBe("Khan");
  });

  it("uses a provided display name first", () => {
    expect(formatStudentName({ firstName: "Arslan", lastName: "Arslan", name: "Arslan Khan" })).toBe("Arslan Khan");
  });

  it("collapses stored duplicate display names", () => {
    expect(formatDisplayName("ALI ALI")).toBe("ALI");
    expect(formatStudentName({ name: "Amaz Amaz" })).toBe("Amaz");
  });

  it("does not invent a last name when splitting single-word names", () => {
    expect(splitFullName("ALI")).toEqual({ firstName: "ALI", lastName: "" });
    expect(splitFullName("Hamza Zahoor")).toEqual({ firstName: "Hamza", lastName: "Zahoor" });
  });
});
