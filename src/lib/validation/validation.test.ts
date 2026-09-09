import { describe, expect, it } from "vitest";
import { ADMISSION_NUMBER_REGEX, formatAdmissionNumber, parseAdmissionNumber, sanitizeAdmissionNumberInput } from "@/lib/admission-number";
import { attendanceSubmissionSchema } from "@/lib/validation/attendance";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";
import { profileFormSchema } from "@/lib/validation/profile";
import { otherStaffRecordSchema, staffFormSchema } from "@/lib/validation/staff";
import { studentSchema } from "@/lib/validation/students";

const student = {
  admission_number: "2026-0001",
  student_cnic: "35202-7654321-1",
  first_name: "Alex",
  last_name: "Rivera",
  name_en: "Alex Rivera",
  date_of_birth: "2010-04-14",
  gender: "male",
  religion: "Islam",
  email: "alex@example.com",
  phone: "0300-1234567",
  address: "742 Maplewood Dr",
  admission_date: "2026-08-15",
  status: "active",
  class_id: "50000000-0000-0000-0000-000000000001",
  father_name_en: "Carlos Rivera",
  father_phone: "0303-1234567",
  father_cnic: "35202-1234567-1",
  father_alive: "yes",
  guardian_name: "Maria Rivera",
  guardian_relationship: "Mother",
  guardian_email: "maria@example.com",
  guardian_phone: "0301-9876543"
};

describe("validation schemas", () => {
  it("accepts a complete student payload", () => {
    expect(studentSchema.safeParse(student).success).toBe(true);
  });

  it("requires student cnic and displays 'Please enter CNIC.'", () => {
    const emptyCnicResult = studentSchema.safeParse({ ...student, student_cnic: "" });
    expect(emptyCnicResult.success).toBe(false);
    if (!emptyCnicResult.success) {
      const cnicIssue = emptyCnicResult.error.issues.find((i) => i.path.includes("student_cnic"));
      expect(cnicIssue?.message).toBe("Please enter CNIC.");
    }

    const missingCnicResult = studentSchema.safeParse({ ...student, student_cnic: undefined });
    expect(missingCnicResult.success).toBe(false);
    if (!missingCnicResult.success) {
      const cnicIssue = missingCnicResult.error.issues.find((i) => i.path.includes("student_cnic"));
      expect(cnicIssue?.message).toBe("Please enter CNIC.");
    }
  });

  it("enforces 13-digit cnic format validation when student cnic is entered incorrectly", () => {
    const invalidCnicResult = studentSchema.safeParse({ ...student, student_cnic: "12345" });
    expect(invalidCnicResult.success).toBe(false);
    if (!invalidCnicResult.success) {
      const cnicIssue = invalidCnicResult.error.issues.find((i) => i.path.includes("student_cnic"));
      expect(cnicIssue?.message).toBe("Enter a valid 13-digit CNIC");
    }
  });

  it("requires a student date of birth", () => {
    expect(studentSchema.safeParse({ ...student, date_of_birth: "" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...student, date_of_birth: undefined }).success).toBe(false);
  });

  it("rejects invalid student email and phone", () => {
    const result = studentSchema.safeParse({ ...student, email: "bad", guardian_phone: "abc" });
    expect(result.success).toBe(false);
  });

  it("normalizes student and guardian emails to lowercase", () => {
    const result = studentSchema.safeParse({
      ...student,
      email: "  Alex.Rivera@Example.COM  ",
      guardian_email: "Maria.Guardian@Example.COM"
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("alex.rivera@example.com");
    expect(result.data.guardian_email).toBe("maria.guardian@example.com");
  });

  it("normalizes staff and profile emails to lowercase", () => {
    const staffResult = staffFormSchema.safeParse({
      full_name: "Jane Doe",
      email: "Jane.Doe@School.EDU",
      password: "secret123",
      cnic: "3520212345671",
      phone: "0300-0000000",
      gender: "female",
      role: "teacher"
    });
    const profileResult = profileFormSchema.safeParse({
      fullName: "Jane Doe",
      cnic: "3520212345671",
      gender: "female",
      phone: "",
      personalEmail: "Jane.Personal@Gmail.COM",
      department: "",
      jobTitle: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: ""
    });

    expect(staffResult.success).toBe(true);
    expect(profileResult.success).toBe(true);
    if (!staffResult.success || !profileResult.success) return;
    expect(staffResult.data.email).toBe("jane.doe@school.edu");
    expect(profileResult.data.personalEmail).toBe("jane.personal@gmail.com");
  });

  it("rejects digits and symbols in english name fields", () => {
    const studentResult = studentSchema.safeParse({
      ...student,
      admission_number: "2026-ABC",
      name_en: "Alex123",
    });
    const staffResult = staffFormSchema.safeParse({
      full_name: "Jane#Doe",
      email: "jane.doe@school.edu",
      password: "secret123",
      role: "teacher"
    });
    const profileResult = profileFormSchema.safeParse({
      fullName: "Jane42",
      phone: "",
      personalEmail: "",
      department: "",
      jobTitle: "",
      address: "",
      emergencyContactName: "John@Home",
      emergencyContactPhone: ""
    });

    expect(studentResult.success).toBe(false);
    expect(staffResult.success).toBe(false);
    expect(profileResult.success).toBe(false);
  });

  it("accepts yyyy-sequence admission numbers and rejects malformed values", () => {
    expect(ADMISSION_NUMBER_REGEX.test("2026-12")).toBe(true);
    expect(ADMISSION_NUMBER_REGEX.test("2026-0001")).toBe(true);
    expect(ADMISSION_NUMBER_REGEX.test("26-12")).toBe(false);
    expect(ADMISSION_NUMBER_REGEX.test("2026-AB12")).toBe(false);
    expect(ADMISSION_NUMBER_REGEX.test("2026-0")).toBe(false);
  });

  it("normalizes manual admission number input to the current year and numeric sequence", () => {
    expect(sanitizeAdmissionNumberInput("2026-12a@", 2026)).toBe("2026-12");
    expect(sanitizeAdmissionNumberInput("12abc", 2026)).toBe("2026-12");
    expect(sanitizeAdmissionNumberInput("", 2026)).toBe("");
    expect(formatAdmissionNumber(2026, 14)).toBe("2026-14");
    expect(parseAdmissionNumber("2026-14")).toEqual({ year: 2026, sequence: 14 });
  });

  it("accepts accented english names and sanitized other staff records", () => {
    const studentResult = studentSchema.safeParse({
      ...student,
      name_en: "Mary-Jane D'Souza",
      father_name_en: "Jose Alvarez",
    });
    const staffResult = staffFormSchema.safeParse({
      full_name: "Andre d'Almeida",
      email: "andre@school.edu",
      password: "secret123",
      cnic: "3520212345671",
      phone: "0300-0000000",
      gender: "male",
      role: "teacher"
    });
    const otherStaffResult = otherStaffRecordSchema.safeParse({
      fullName: "Jean-Luc Picard",
      cnic: "3520212345671",
      gender: "male",
      category: "office_assistant",
      department: "Admin",
      jobTitle: "Office Assistant",
      phone: "0300-0000000",
      monthlySalary: null
    });

    expect(studentResult.success).toBe(true);
    expect(staffResult.success).toBe(true);
    expect(otherStaffResult.success).toBe(true);
  });

  it("handles conditional father and guardian validation based on father_alive", () => {
    // When father is alive, father phone & cnic are required
    const aliveMissingFatherPhone = studentSchema.safeParse({
      ...student,
      father_alive: "yes",
      father_phone: "",
      father_cnic: "35202-1234567-1"
    });
    expect(aliveMissingFatherPhone.success).toBe(false);

    const aliveMissingFatherCnic = studentSchema.safeParse({
      ...student,
      father_alive: "yes",
      father_phone: "0300-1234567",
      father_cnic: ""
    });
    expect(aliveMissingFatherCnic.success).toBe(false);

    // When father is not alive, father phone & cnic are optional, but father name and guardian details are required
    const deceasedWithGuardian = studentSchema.safeParse({
      ...student,
      father_alive: "no",
      father_name_en: "Late John Doe",
      father_phone: "",
      father_cnic: "",
      guardian_name: "Jane Doe",
      guardian_relationship: "Mother",
      guardian_phone: "0300-9876543"
    });
    expect(deceasedWithGuardian.success).toBe(true);

    const deceasedMissingFatherName = studentSchema.safeParse({
      ...student,
      father_alive: "no",
      father_name_en: "",
      guardian_name: "Jane Doe",
      guardian_relationship: "Mother",
      guardian_phone: "0300-9876543"
    });
    expect(deceasedMissingFatherName.success).toBe(false);

    const deceasedMissingGuardian = studentSchema.safeParse({
      ...student,
      father_alive: "no",
      father_name_en: "Late John Doe",
      father_phone: "",
      father_cnic: "",
      guardian_name: "",
      guardian_relationship: "",
      guardian_phone: ""
    });
    expect(deceasedMissingGuardian.success).toBe(false);
  });

  it("strips invalid characters from live name input sanitizers", () => {
    expect(sanitizeEnglishNameInput("Mary123 @Jane!")).toBe("Mary123 Jane");
  });

  it("normalizes blank optional student fields to null", () => {
    const result = studentSchema.safeParse({
      ...student,
      admission_number: "   ",
      email: "",
      phone: "",
      address: "   ",
      class_id: "",
      major: "",
      guardian_name: "Guardian",
      guardian_relationship: "",
      guardian_email: "",
      guardian_phone: ""
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.admission_number).toBeNull();
    expect(result.data.email).toBeNull();
    expect(result.data.phone).toBeNull();
    expect(result.data.address).toBeNull();
    expect(result.data.class_id).toBeNull();
    expect(result.data.major).toBeNull();
    expect(result.data.guardian_name).toBeNull();
    expect(result.data.guardian_relationship).toBeNull();
    expect(result.data.guardian_email).toBeNull();
    expect(result.data.guardian_phone).toBeNull();
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
