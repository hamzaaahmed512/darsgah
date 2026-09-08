"use server";

import { challanDiscountSchema, challanEditSchema } from "@/lib/validation/finance";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import {
  createFeeStructure,
  upsertFeeStructuresForClasses,
  updateFeeStructure,
  deleteFeeStructure,
  applyDiscount,
  editFeeChallan,
  recordPayment,
  voidPayment,
  generateFeeChallans,
  createManualTransaction
} from "@/lib/services/finance";

function numberOrZero(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value === null) return 0;
  if (typeof value === "string" && value.trim() === "") return 0;
  return Number(value);
}

export async function createFeeStructureAction(formData: FormData) {
  const user = await requireUser("finance:manage");
  
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    class_id: formData.get("class_id") as string,
    tuition_fee: numberOrZero(formData, "tuition_fee"),
    admission_fee: numberOrZero(formData, "admission_fee"),
    examination_fee: numberOrZero(formData, "examination_fee"),
    library_fee: numberOrZero(formData, "library_fee"),
    laboratory_fee: numberOrZero(formData, "laboratory_fee"),
    transport_fee: numberOrZero(formData, "transport_fee"),
    miscellaneous_charges: numberOrZero(formData, "miscellaneous_charges")
  };

  await createFeeStructure(user, values);
  
  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
}

export async function createFeeStructuresForClassesAction(formData: FormData) {
  const user = await requireUser("finance:manage");
  const classIds = formData.getAll("class_ids").map(String).filter(Boolean);
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    tuition_fee: numberOrZero(formData, "tuition_fee"),
    admission_fee: numberOrZero(formData, "admission_fee"),
    examination_fee: numberOrZero(formData, "examination_fee"),
    library_fee: numberOrZero(formData, "library_fee"),
    laboratory_fee: numberOrZero(formData, "laboratory_fee"),
    transport_fee: numberOrZero(formData, "transport_fee"),
    miscellaneous_charges: numberOrZero(formData, "miscellaneous_charges")
  };

  await upsertFeeStructuresForClasses(user, values, classIds);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
}

export async function updateFeeStructureAction(id: string, formData: FormData) {
  const user = await requireUser("finance:manage");
  
  const values = {
    academic_year_id: formData.get("academic_year_id") as string,
    class_id: formData.get("class_id") as string,
    tuition_fee: numberOrZero(formData, "tuition_fee"),
    admission_fee: numberOrZero(formData, "admission_fee"),
    examination_fee: numberOrZero(formData, "examination_fee"),
    library_fee: numberOrZero(formData, "library_fee"),
    laboratory_fee: numberOrZero(formData, "laboratory_fee"),
    transport_fee: numberOrZero(formData, "transport_fee"),
    miscellaneous_charges: numberOrZero(formData, "miscellaneous_charges")
  };

  await updateFeeStructure(user, id, values);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
}

export async function deleteFeeStructureAction(id: string) {
  const user = await requireUser("finance:manage");
  await deleteFeeStructure(user, id);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
}

export async function applyDiscountAction(challanId: string, formData: FormData) {
  const user = await requireUser("finance:manage");
  const values = challanDiscountSchema.parse(Object.fromEntries(formData));
  await applyDiscount(user, challanId, values);
  revalidatePath("/finance/challans");
}

export async function editFeeChallanAction(challanId: string, formData: FormData) {
  const user = await requireUser("finance:manage");
  const values = challanEditSchema.parse({
    updated_at: formData.get("updated_at"), due_date: formData.get("due_date"),
    line_items: JSON.parse(String(formData.get("line_items")))
  });
  await editFeeChallan(user, challanId, values);
  revalidatePath("/finance/challans");
}

export async function assignLegacyPaymentAction(challanId: string, paymentId: string) {
  const user = await requireUser("finance:manage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_legacy_challan_payment", {
    p_school_id: user.schoolId, p_challan_id: challanId, p_payment_id: paymentId
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finance/challans");
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser("finance:manage");

  const values = {
    challan_id: formData.get("challan_id") as string,
    amount: Number(formData.get("amount")),
    payment_method: formData.get("payment_method") as string,
    transaction_number: formData.get("transaction_number") as string || undefined,
    reference_number: formData.get("reference_number") as string || undefined,
    remarks: formData.get("remarks") as string || undefined
  };

  const payment = await recordPayment(user, values);

  revalidatePath("/finance/challans");
  revalidatePath("/finance/fees");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
  
  return payment;
}

export async function voidPaymentAction(paymentId: string, reason: string) {
  const user = await requireUser("finance:manage");
  await voidPayment(user, paymentId, reason);

  revalidatePath("/finance/fees");
  revalidatePath("/finance/challans");
  revalidatePath("/finance/dashboard");
  revalidatePath("/finance/transactions");
}

export async function generateFeeChallansAction(values: { month: string; student_id?: string; class_id?: string }) {
  try {
    const user = await requireUser("finance:manage");
    const result = await generateFeeChallans(user, values);
    revalidatePath("/finance/challans");
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
