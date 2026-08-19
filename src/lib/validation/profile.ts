import { z } from "zod";
import { normalizedPakistaniPhone } from "@/lib/pakistan-format";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().email("Enter a valid email address").nullable());

// Pakistani mobile number: exactly 10 digits, first digit must be 3
// User enters the 10-digit local number (without +92); we prefix +92 before saving
const pakistaniPhone = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? normalizedPakistaniPhone(v) : null))
  .pipe(
    z
      .string()
      .regex(/^3[0-9]{9}$/, "Enter a valid 10-digit Pakistani number starting with 3 (e.g. 3001234567)")
      .nullable()
  );

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100),
  phone: pakistaniPhone,
  personalEmail: optionalEmail,
  department: optionalText(100),
  jobTitle: optionalText(100),
  address: optionalText(500),
  emergencyContactName: optionalText(100),
  emergencyContactPhone: optionalText(40)
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
