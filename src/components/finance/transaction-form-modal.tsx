"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { createManualTransactionAction } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TRANSACTION_CATEGORY_LABELS, type TransactionCategory, type TransactionDirection } from "@/lib/finance-transactions";

export function TransactionFormModal({
  direction,
  students,
  triggerLabel,
  title,
  description,
  defaultCategory,
  defaultPaymentMethod = "cash"
}: {
  direction: TransactionDirection;
  students: Array<{ id: string; name: string; admissionNumber: string }>;
  triggerLabel?: string;
  title?: string;
  description?: string;
  defaultCategory?: TransactionCategory;
  defaultPaymentMethod?: "cash" | "bank_transfer" | "cheque" | "online_payment" | "other";
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const categories = direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isIncome = direction === "income";
  const fallbackCategory = defaultCategory && categories.includes(defaultCategory as any) ? defaultCategory : categories[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("direction", direction);
    setError(null);
    startTransition(async () => {
      try {
        const result = await createManualTransactionAction(formData);
        pushToast(`${isIncome ? "Income" : "Expense"} recorded as ${result.receipt_number}.`, "success");
        form.reset();
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to record transaction.");
      }
    });
  }

  return <>
    <Button type="button" variant={isIncome ? "primary" : "secondary"} onClick={() => setOpen(true)}>
      {isIncome ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
      {triggerLabel ?? (isIncome ? "Add income / payment" : "Add expense")}
    </Button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
        <div className="flex items-start justify-between border-b border-outline/50 px-6 py-5">
          <div><h2 className="font-display text-xl font-bold text-ink">{title ?? (isIncome ? "Add income or payment" : "Add expense")}</h2><p className="mt-1 text-sm text-muted">{description ?? "Record a manual ledger entry with its date and source details."}</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger sm:col-span-2">{error}</div> : null}
          <Field label="Type" required>
            <Select name="category" required defaultValue={fallbackCategory}>{categories.map((category) => <option key={category} value={category}>{TRANSACTION_CATEGORY_LABELS[category]}</option>)}</Select>
          </Field>
          <Field label="Amount (PKR)"><Input name="amount" type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Date"><Input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Payment method"><Select name="payment_method" defaultValue={defaultPaymentMethod}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="online_payment">Online payment</option><option value="other">Other</option></Select></Field>
          {isIncome ? <Field label="Student (optional)"><Select name="student_id" defaultValue=""><option value="">Not linked to a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.admissionNumber}</option>)}</Select></Field> : null}
          <Field label={isIncome ? "Received from" : "Paid to"}><Input name="party_name" placeholder={isIncome ? "Person or organization" : "Landlord, vendor, staff member..."} /></Field>
          <Field label="Reference number"><Input name="reference_number" placeholder="Bank reference, invoice, etc." /></Field>
          <div className="sm:col-span-2"><Field label="Description / notes"><Textarea name="description" placeholder="What was this transaction for?" /></Field></div>
          {isIncome ? <p className="text-xs leading-5 text-muted sm:col-span-2">For a payment that must reduce a student&apos;s outstanding fee balance, record it from Fee Management. It will automatically appear here too.</p> : null}
          <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>{pending ? "Saving..." : `Record ${direction}`}</Button></div>
        </form>
      </div>
    </div> : null}
  </>;
}
