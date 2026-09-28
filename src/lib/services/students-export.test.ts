import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportStudents } from "./students";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const user = {
  id: "registrar-1",
  email: "registrar@example.com",
  fullName: "Registrar",
  avatarUrl: null,
  schoolId: "school-1",
  schoolName: "School",
  role: "student_staff" as const,
  department: null,
  jobTitle: null,
  mustChangePassword: false,
  permissions: ["students:view"],
  customRoleId: null
};

function student(index: number) {
  return {
    id: `student-${String(index).padStart(4, "0")}`,
    admission_number: `2026-${index}`,
    first_name: "Student",
    last_name: String(index),
    name_en: null,
    guardian_name: "Guardian",
    father_name_en: null,
    father_phone: "03001234567",
    gender: "male",
    class_name: "Grade 9 - A",
    grade_name: "Grade 9",
    section_name: "A",
    status: "active",
    date_of_birth: "2012-01-01",
    email: "",
    phone: "",
    address: ""
  };
}

describe("exportStudents", () => {
  let query: any;

  beforeEach(() => {
    query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn()
        .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => student(index + 1)), error: null })
        .mockResolvedValueOnce({ data: [student(501), student(502)], error: null })
    };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never);
  });

  it("exports every filtered row instead of only the visible page", async () => {
    const rows = await exportStudents(user, { status: "active", page: 3, pageSize: 10 });

    expect(rows).toHaveLength(502);
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(query.range).toHaveBeenNthCalledWith(2, 500, 999);
    expect(rows[0]["Name (EN)"]).toBe("Student 1");
  });
});
