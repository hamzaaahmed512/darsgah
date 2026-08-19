import { z } from "zod";
import { formatCnic } from "@/lib/pakistan-format";

const phone = z
  .string()
  .trim()
  .regex(/^[+()\-\s0-9]{7,24}$/, "Enter a valid phone number")
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
  gender: z.enum(["male", "female"]).optional().nullable(),
  photo_url: z.string().url().or(z.literal("")).optional().nullable(),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).nullable().optional(),
  phone,
  address: z.string().trim().max(240).optional().nullable(),
  admission_date: z.string().date("Enter a valid admission date").or(z.literal("")).optional().nullable(),
  status: z.enum(["active", "graduated", "transferred", "archived", "cancelled"]).default("active"),
  class_id: z.string().uuid("Please select a class").or(z.literal("")).optional().nullable(),
  
  // Father details
  father_name_en: z.string().trim().max(120).optional().nullable(),
  father_name_ur: z.string().trim().max(120).optional().nullable(),
  father_phone: phone,
  father_cnic: z.string()
    .trim()
    .transform(formatCnic)
    .pipe(z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Enter a valid 13-digit CNIC").or(z.literal("")))
    .optional()
    .nullable(),
    
  // Legacy guardian fields (made optional to allow gradual migration)
  guardian_name: z.string().trim().max(120).optional(),
  guardian_relationship: z.string().trim().max(60).optional(),
  guardian_email: z.string().trim().email().or(z.literal("")).nullable().optional(),
  guardian_phone: z.string().trim().optional(),
  emergency_contact_name: z.string().trim().max(120).optional(),
  emergency_contact_phone: z.string().trim().optional()
});

export type StudentFormValues = z.infer<typeof studentSchema>;
