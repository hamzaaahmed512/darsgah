import { z } from "zod";
import { normalizeOptionalEmail } from "@/lib/email";
import { formatPakistaniPhoneForStorage, isValidPakistaniPhone } from "@/lib/pakistan-format";
import { englishNameSchema } from "@/lib/validation/names";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalEnglishName = (label: string, max: number) =>
  z
    .preprocess(
      (value) => typeof value === "string" ? value.trim() || null : value,
      englishNameSchema(label, max).nullable().optional()
    );

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
  fullName: englishNameSchema("Full name", 100, 2),
  phone: pakistaniPhone,
  personalEmail: optionalEmail,
  department: optionalText(100),
  jobTitle: optionalText(100),
  address: optionalText(500),
  emergencyContactName: optionalEnglishName("Emergency contact name", 100),
  emergencyContactPhone: pakistaniPhone
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
