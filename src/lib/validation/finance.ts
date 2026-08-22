import { z } from "zod";
import { TRANSACTION_CATEGORIES } from "@/lib/finance-transactions";

export const feeStructureSchema = z.object({
  academic_year_id: z.string().uuid("Invalid Academic Session"),
  class_id: z.string().uuid("Invalid Class selection"),
  tuition_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  admission_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  examination_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  library_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  laboratory_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  transport_fee: z.coerce.number().min(0, "Fee must be greater than or equal to 0"),
  miscellaneous_charges: z.coerce.number().min(0, "Fee must be greater than or equal to 0")
});

export type FeeStructureFormValues = z.infer<typeof feeStructureSchema>;

export const discountSchema = z.object({
  discount_type: z.enum(["percentage", "fixed", "none"]),
  discount_value: z.coerce.number().min(0, "Discount value must be positive"),
  discount_reason: z.enum(["scholarship", "sibling_discount", "merit", "need_based", "special_approval"]),
  discount_remarks: z.string().optional(),
  discount_approved_by: z.string().min(1, "Approved by name is required")
});

export type DiscountFormValues = z.infer<typeof discountSchema>;

export const paymentSchema = z.object({
  student_fee_account_id: z.string().uuid("Invalid Fee Account ID"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  payment_method: z.enum(["cash", "bank_transfer", "cheque", "online_payment"]),
  transaction_number: z.string().optional(),
  reference_number: z.string().optional(),
  remarks: z.string().optional()
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const voidPaymentSchema = z.object({
  void_reason: z.string().min(4, "Void reason must be at least 4 characters long")
});

export type VoidPaymentValues = z.infer<typeof voidPaymentSchema>;

export const monthlyGenerationSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month"),
  student_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional()
}).refine((value) => !(value.student_id && value.class_id), "Choose a student or a class, not both");

export const payrollGenerationSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month"),
  teacher_id: z.string().uuid().optional()
});

export const manualTransactionSchema = z.object({
  direction: z.enum(["income", "expense"]),
  category: z.enum(TRANSACTION_CATEGORIES),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  transaction_date: z.string().date("Choose a valid date"),
  party_name: z.string().trim().max(160).optional(),
  student_id: z.string().uuid().or(z.literal("")).optional(),
  payment_method: z.enum(["cash", "bank_transfer", "cheque", "online_payment", "other"]).optional(),
  reference_number: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional()
});
