import { describe, expect, it } from "vitest";
import { attendanceSubmissionSchema } from "@/lib/validation/attendance";
import { studentSchema } from "@/lib/validation/students";

const student = {
  admission_number: "2026-0001",
  first_name: "Alex",
  last_name: "Rivera",
  name_en: "Alex Rivera",
  preferred_name: "",
  date_of_birth: "2010-04-14",
  gender: "male",
  email: "alex@example.com",
  phone: "+1 (555) 123-4567",
  address: "742 Maplewood Dr",
  admission_date: "2026-08-15",
  status: "active",
  class_id: "50000000-0000-0000-0000-000000000001",
  guardian_name: "Maria Rivera",
  guardian_relationship: "Mother",
  guardian_email: "maria@example.com",
  guardian_phone: "+1 (555) 987-6543",
  emergency_contact_name: "Juan Rivera",
  emergency_contact_phone: "+1 (555) 987-6544"
};

describe("validation schemas", () => {
  it("accepts a complete student payload", () => {
    expect(studentSchema.safeParse(student).success).toBe(true);
  });

  it("rejects invalid student email and phone", () => {
    const result = studentSchema.safeParse({ ...student, email: "bad", guardian_phone: "abc" });
    expect(result.success).toBe(false);
  });

  it("prevents empty attendance submissions", () => {
    const result = attendanceSubmissionSchema.safeParse({
      class_id: "50000000-0000-0000-0000-000000000001",
      attendance_date: "2026-09-14",
      records: []
    });
    expect(result.success).toBe(false);
  });

  it("accepts duplicate-safe attendance keys", () => {
    const result = attendanceSubmissionSchema.safeParse({
      class_id: "50000000-0000-0000-0000-000000000001",
      attendance_date: "2026-09-14",
      records: [{ student_id: "60000000-0000-0000-0000-000000000001", status: "present", note: "" }]
    });
    expect(result.success).toBe(true);
  });
});
