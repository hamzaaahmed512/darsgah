import { z } from "zod";
import { ADMISSION_NUMBER_REGEX } from "@/lib/admission-number";
import { normalizeEmail } from "@/lib/email";
import { formatCnic, isValidPakistaniPhone } from "@/lib/pakistan-format";
import { englishNameSchema, urduNameSchema } from "@/lib/validation/names";

const placeholderArtifacts = new Set([
  "-",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "guardian",
  "guardian name",
  "emergency contact",
  "emergency contact name",
  "phone",
  "email",
  "address"
]);

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (placeholderArtifacts.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

const optionalText = (max: number) => z.preprocess(cleanOptionalString, z.string().max(max).nullable().optional());
const optionalAdmissionNumber = z.preprocess(
  cleanOptionalString,
  z
    .string()
    .regex(ADMISSION_NUMBER_REGEX, "Admission number must use the format YYYY-RR, for example 2026-12")
    .nullable()
    .optional()
);
const optionalCnic = (label: string) =>
  z.preprocess(
    cleanOptionalString,
    z
      .string()
      .transform(formatCnic)
      .pipe(z.string().regex(/^\d{5}-\d{7}-\d{1}$/, `Enter a valid 13-digit ${label}`))
      .nullable()
      .optional()
  );
const optionalEnglishName = (label: string, max: number) =>
  z.preprocess(cleanOptionalString, englishNameSchema(label, max).nullable().optional());
const optionalUrduName = (label: string, max: number) =>
  z.preprocess(cleanOptionalString, urduNameSchema(label, max).nullable().optional());
const optionalDate = z.preprocess(cleanOptionalString, z.string().date("Enter a valid date").nullable().optional());
const optionalEmail = z.preprocess(
  cleanOptionalString,
  z.string().trim().toLowerCase().email("Enter a valid email").transform(normalizeEmail).nullable().optional()
);
const optionalUrl = z.preprocess(cleanOptionalString, z.string().url().nullable().optional());
const optionalUuid = (message: string) => z.preprocess(cleanOptionalString, z.string().uuid(message).nullable().optional());
const optionalMajor = z.preprocess(
  cleanOptionalString,
  z.string().trim().min(1).max(120).nullable().optional()
);

const phone = z
  .preprocess(
    cleanOptionalString,
    z.string().refine(isValidPakistaniPhone, "Phone number must be exactly 11 digits, like 0300-0000000").nullable().optional()
  );

export const studentSchema = z.object({
  admission_number: optionalAdmissionNumber,
  student_cnic: optionalCnic("Student CNIC / Form-B"),
  name_en: englishNameSchema("Name (English)", 80),
  name_ur: optionalUrduName("Name (Urdu)", 80),
  first_name: optionalText(80), // for backwards compat
  last_name: optionalText(80), // for backwards compat
  date_of_birth: optionalDate,
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  religion: z.string().trim().min(1, "Religion is required").max(60),
  photo_url: optionalUrl,
  email: optionalEmail,
  phone,
  address: optionalText(240),
  admission_date: optionalDate,
  status: z.enum(["active", "graduated", "transferred", "archived", "cancelled"]).default("active"),
  class_id: optionalUuid("Please select a class"),
  major: optionalMajor,
  
  // Father details
  father_name_en: englishNameSchema("Father's name", 120),
  father_name_ur: optionalUrduName("Father's name (Urdu)", 120),
  father_phone: z.string().trim().min(1, "Father's phone is required").refine(isValidPakistaniPhone, "Phone number must be exactly 11 digits, like 0300-0000000"),
  father_cnic: z.string()
    .trim()
    .transform(formatCnic)
    .pipe(z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Enter a valid 13-digit CNIC")),
  father_alive: z.enum(["yes", "no"]).default("yes"),
    
  guardian_name: optionalEnglishName("Guardian name", 120),
  guardian_relationship: optionalText(60),
  guardian_email: optionalEmail,
  guardian_phone: phone,
  emergency_contact_name: optionalEnglishName("Emergency contact name", 120),
  emergency_contact_phone: phone
}).superRefine((values, ctx) => {
  if (values.father_alive !== "no") return;
  if (!values.guardian_name?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardian_name"], message: "Guardian name is required when father is not alive" });
  }
  if (!values.guardian_relationship?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardian_relationship"], message: "Guardian relationship is required when father is not alive" });
  }
  if (!values.guardian_phone?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardian_phone"], message: "Guardian phone is required when father is not alive" });
  }
});

export type StudentFormValues = z.infer<typeof studentSchema>;

export function sanitizeStudentFormValues(values: StudentFormValues): StudentFormValues {
  return studentSchema.parse(values);
}
