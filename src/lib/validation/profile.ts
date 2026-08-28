import { z } from "zod";
import { normalizeOptionalEmail } from "@/lib/email";
import { formatPakistaniPhoneForStorage, isValidPakistaniPhone } from "@/lib/pakistan-format";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalEmail = z
  .preprocess(normalizeOptionalEmail, z.string().email("Enter a valid email address").nullable())
  .pipe(z.string().email("Enter a valid email address").nullable());

const pakistaniPhone = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || isValidPakistaniPhone(v), "Phone number must be exactly 11 digits, like 0300-0000000")
  .transform((v) => (v ? formatPakistaniPhoneForStorage(v) : null));

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100),
  phone: pakistaniPhone,
  personalEmail: optionalEmail,
  department: optionalText(100),
  jobTitle: optionalText(100),
  address: optionalText(500),
  emergencyContactName: optionalText(100),
  emergencyContactPhone: pakistaniPhone
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
