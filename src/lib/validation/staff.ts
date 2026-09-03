import { z } from "zod";
import { normalizeEmail } from "@/lib/email";
import { englishNameSchema } from "@/lib/validation/names";

export const staffFormSchema = z.object({
  full_name: englishNameSchema("Full name", 100, 2),
  email: z.string().trim().toLowerCase().email("Enter a valid email").transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["teacher", "head_teacher", "staff", "student_staff", "cashier", "principal", "administrator"]),
  custom_role_id: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.string().uuid().optional()
  ),
  department: z.string().trim().max(100).optional().nullable(),
  job_title: z.string().trim().max(100).optional().nullable(),
  salary: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().positive("Salary must be greater than 0").optional()
  ),
});

export const otherStaffRecordSchema = z.object({
  fullName: englishNameSchema("Full name", 100, 2),
  category: z.enum(["peon", "guard", "cleaner", "driver", "office_assistant", "other"]),
  department: z.string().trim().max(100).optional().nullable(),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  monthlySalary: z.number().finite().nonnegative().optional().nullable()
});

export const staffProfileUpdateSchema = z.object({
  fullName: englishNameSchema("Full name", 100, 2),
  phone: z.string().trim().max(40).optional().nullable(),
  personalEmail: z.preprocess(
    (value) => value === "" || value == null ? null : value,
    z.string().trim().toLowerCase().email("Enter a valid personal email").nullable()
  ),
  department: z.string().trim().max(100).optional().nullable(),
  jobTitle: z.string().trim().max(100).optional().nullable()
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;
export type StaffProfileUpdateValues = z.infer<typeof staffProfileUpdateSchema>;
