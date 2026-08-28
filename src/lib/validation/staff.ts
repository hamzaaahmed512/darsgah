import { z } from "zod";
import { normalizeEmail } from "@/lib/email";

export const staffFormSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["teacher", "head_teacher", "staff", "student_staff", "cashier", "principal", "administrator"]),
  department: z.string().trim().max(100).optional().nullable(),
  job_title: z.string().trim().max(100).optional().nullable(),
  salary: z.preprocess(
    (value) => value === "" || value == null ? undefined : value,
    z.coerce.number().positive("Salary must be greater than 0").optional()
  ),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;
