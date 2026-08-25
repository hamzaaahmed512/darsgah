"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  createFeeStructure,
  upsertFeeStructuresForClasses,
  updateFeeStructure,
  deleteFeeStructure,
  applyDiscount,
  recordPayment,
  voidPayment,
  generateFeeChallans,
  createManualTransaction
} from "@/lib/services/finance";

export async function createFeeStructureAction(formData: FormData) {
  const user = await requireUser("finance:manage");
  
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    class_id: formData.get("class_id") as string,
    tuition_fee: Number(formData.get("tuition_fee")),
    admission_fee: Number(formData.get("admission_fee")),
    examination_fee: Number(formData.get("examination_fee")),
    library_fee: Number(formData.get("library_fee")),
    laboratory_fee: Number(formData.get("laboratory_fee")),
    transport_fee: Number(formData.get("transport_fee")),
    miscellaneous_charges: Number(formData.get("miscellaneous_charges"))
  };

  await createFeeStructure(user, values);
  
  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/student-fees");
}

export async function createFeeStructuresForClassesAction(formData: FormData) {
  const user = await requireUser("finance:manage");
  const classIds = formData.getAll("class_ids").map(String).filter(Boolean);
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    tuition_fee: Number(formData.get("tuition_fee")),
    admission_fee: Number(formData.get("admission_fee")),
    examination_fee: Number(formData.get("examination_fee")),
    library_fee: Number(formData.get("library_fee")),
    laboratory_fee: Number(formData.get("laboratory_fee")),
    transport_fee: Number(formData.get("transport_fee")),
    miscellaneous_charges: Number(formData.get("miscellaneous_charges"))
  };

  await upsertFeeStructuresForClasses(user, values, classIds);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/student-fees");
}

export async function updateFeeStructureAction(id: string, formData: FormData) {
  const user = await requireUser("finance:manage");
  
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    class_id: formData.get("class_id") as string,
    tuition_fee: Number(formData.get("tuition_fee")),
    admission_fee: Number(formData.get("admission_fee")),
    examination_fee: Number(formData.get("examination_fee")),
    library_fee: Number(formData.get("library_fee")),
    laboratory_fee: Number(formData.get("laboratory_fee")),
    transport_fee: Number(formData.get("transport_fee")),
    miscellaneous_charges: Number(formData.get("miscellaneous_charges"))
  };

  await updateFeeStructure(user, id, values);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/student-fees");
}

export async function deleteFeeStructureAction(id: string) {
  const user = await requireUser("finance:manage");
  await deleteFeeStructure(user, id);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/student-fees");
}

export async function applyDiscountAction(accountId: string, formData: FormData) {
  const user = await requireUser("finance:manage");
  
  const values = {
    discount_type: formData.get("discount_type") as string,
    discount_value: Number(formData.get("discount_value")),
    discount_reason: formData.get("discount_reason") as string,
    discount_remarks: formData.get("discount_remarks") as string || undefined,
    discount_approved_by: formData.get("discount_approved_by") as string
  };

  await applyDiscount(user, accountId, values);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/student-fees");
  revalidatePath(`/finance/student-fees/${accountId}`);
  revalidatePath("/finance/dashboard");
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser("finance:view"); // both manager & registrar can record payment

  const values = {
    student_fee_account_id: formData.get("student_fee_account_id") as string,
    amount: Number(formData.get("amount")),
    payment_method: formData.get("payment_method") as string,
    transaction_number: formData.get("transaction_number") as string || undefined,
    reference_number: formData.get("reference_number") as string || undefined,
    remarks: formData.get("remarks") as string || undefined
  };

  const payment = await recordPayment(user, values);

  revalidatePath("/finance/payments");
  revalidatePath("/finance/fees");
  revalidatePath("/finance/student-fees");
  revalidatePath(`/finance/student-fees/${values.student_fee_account_id}`);
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
  
  return payment;
}

export async function voidPaymentAction(paymentId: string, reason: string) {
  const user = await requireUser("finance:manage");
  const payment = await voidPayment(user, paymentId, reason);

  revalidatePath("/finance/payments");
  revalidatePath("/finance/fees");
  revalidatePath("/finance/student-fees");
  revalidatePath(`/finance/student-fees/${payment.student_fee_account_id}`);
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
}

export async function generateFeeChallansAction(values: { month: string; student_id?: string; class_id?: string }) {
  try {
    const user = await requireUser("finance:manage");
    const result = await generateFeeChallans(user, values);
    revalidatePath("/finance/fees");
    return { ok: true, created: Number(result?.created_count ?? 0), skipped: Number(result?.skipped_count ?? 0) };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createManualTransactionAction(formData: FormData) {
  const user = await requireUser("finance:manage");
  const optionalString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const transaction = await createManualTransaction(user, {
    direction: formData.get("direction"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    transaction_date: formData.get("transaction_date"),
    party_name: optionalString("party_name"),
    student_id: optionalString("student_id"),
    payment_method: formData.get("payment_method"),
    reference_number: optionalString("reference_number"),
    description: optionalString("description")
  });
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
  return transaction;
}
