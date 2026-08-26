import { z } from "zod";
import { formatCnic, isValidPakistaniPhone } from "@/lib/pakistan-format";

const phone = z
  .string()
  .trim()
  .refine((value) => !value || isValidPakistaniPhone(value), "Phone number must be exactly 11 digits, like 0300-0000000")
  .or(z.literal(""))
  .nullable()
  .optional();

export const studentSchema = z.object({
  admission_number: z.string().trim().max(32).optional(), // We auto-generate if not supplied
  name_en: z.string().trim().min(1, "Name (English) is required").max(80),
  name_ur: z.string().trim().max(80).optional().nullable(),
  first_name: z.string().trim().max(80).optional(), // for backwards compat
  last_name: z.string().trim().max(80).optional(), // for backwards compat
  date_of_birth: z.string().date("Enter a valid birth date").or(z.literal("")).optional().nullable(),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  religion: z.string().trim().min(1, "Religion is required").max(60),
  photo_url: z.string().url().or(z.literal("")).optional().nullable(),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).nullable().optional(),
  phone,
  address: z.string().trim().min(1, "Address is required").max(240),
  admission_date: z.string().date("Enter a valid admission date").or(z.literal("")).optional().nullable(),
  status: z.enum(["active", "graduated", "transferred", "archived", "cancelled"]).default("active"),
  class_id: z.string().uuid("Please select a class").or(z.literal("")).optional().nullable(),
  major: z.enum(["computer", "biology", "pre_engineering", "computer_economics", "computer_economics_stats"]).or(z.literal("")).optional().nullable(),
  
  // Father details
  father_name_en: z.string().trim().min(1, "Father's name is required").max(120),
  father_name_ur: z.string().trim().max(120).optional().nullable(),
  father_phone: z.string().trim().min(1, "Father's phone is required").refine(isValidPakistaniPhone, "Phone number must be exactly 11 digits, like 0300-0000000"),
  father_cnic: z.string()
    .trim()
    .transform(formatCnic)
    .pipe(z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Enter a valid 13-digit CNIC")),
  father_alive: z.enum(["yes", "no"]).default("yes"),
    
  guardian_name: z.string().trim().max(120).optional(),
  guardian_relationship: z.string().trim().max(60).optional(),
  guardian_email: z.string().trim().email().or(z.literal("")).nullable().optional(),
  guardian_phone: phone,
  emergency_contact_name: z.string().trim().max(120).optional(),
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
