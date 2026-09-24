import { z } from "zod";
import { normalizeEmail } from "@/lib/email";
import { englishNameSchema } from "@/lib/validation/names";
import { formatCnic, formatPakistaniPhoneForStorage, isValidPakistaniPhone } from "@/lib/pakistan-format";

const cnic = z.string().trim().transform(formatCnic).pipe(z.string().regex(/^\d{5}-\d{7}-\d$/, "CNIC must be exactly 13 digits"));
const phone = z.string().trim().refine(isValidPakistaniPhone, "Phone number must be exactly 11 digits").transform(formatPakistaniPhoneForStorage);

export const staffFormSchema = z.object({
  full_name: englishNameSchema("Full name", 100, 2),
  email: z.string().trim().toLowerCase().email("Enter a valid email").transform(normalizeEmail),
  password: z.string().min(8, "Password must be at least 8 characters"),
  cnic,
  phone,
  gender: z.enum(["male", "female"]),
  role: z.enum(["teacher", "head_teacher", "staff", "student_staff", "cashier", "librarian", "principal", "administrator"]),
  custom_role_id: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.string().uuid().optional()
  ),
  department: z.string().trim().max(100).optional().nullable(),
  job_title: z.string().trim().max(100).optional().nullable(),
  salary: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().finite().positive("Salary must be greater than 0")
  ),
  joining_date: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.string().trim().optional().nullable()
  ),
});

export const otherStaffRecordSchema = z.object({
  fullName: englishNameSchema("Full name", 100, 2),
  cnic,
  gender: z.enum(["male", "female"]),
  category: z.enum(["peon", "guard", "cleaner", "driver", "office_assistant", "other"]),
  department: z.string().trim().max(100).optional().nullable(),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  monthlySalary: z.number().finite().positive("Monthly salary must be greater than 0"),
  joiningDate: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.string().trim().optional().nullable()
  )
});

export const staffProfileUpdateSchema = z.object({
  fullName: englishNameSchema("Full name", 100, 2),
  phone: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value == null ? null : value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z
      .string()
      .refine(isValidPakistaniPhone, "Phone number must be a valid 11-digit Pakistani phone (e.g. 0300-0000000)")
      .transform(formatPakistaniPhoneForStorage)
      .nullable()
      .optional()
  ),
  cnic: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value == null ? null : value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z
      .string()
      .transform(formatCnic)
      .pipe(z.string().regex(/^\d{5}-\d{7}-\d$/, "CNIC must be exactly 13 digits"))
      .nullable()
      .optional()
  ),
  gender: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.enum(["male", "female"]).nullable().optional()
  ),
  personalEmail: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().toLowerCase().email("Enter a valid personal email").nullable().optional()
  ),
  department: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(100).nullable().optional()
  ),
  jobTitle: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(100).nullable().optional()
  )
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;
export type StaffProfileUpdateValues = z.infer<typeof staffProfileUpdateSchema>;
