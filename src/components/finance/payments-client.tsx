"use client";

import { useState, useTransition } from "react";
import { Search, Trash2, Info, X, Receipt, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Field, Textarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { recordPaymentAction, voidPaymentAction } from "@/app/(app)/finance/actions";
import { formatClassDisplayName, formatPKR, formatDatePK, formatGradeSection } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { format } from "date-fns";
import Link from "next/link";

interface PaymentsClientProps {
  user: AppUser;
  accounts: any[];
  classes: any[];
  payments: any[];
}

const statusTone = {
  paid: "green",
  partially_paid: "blue",
  unpaid: "yellow",
  overdue: "red"
} as const;

export function PaymentsClient({ user, accounts, classes, payments }: PaymentsClientProps) {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [status, setStatus] = useState("all");
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  // Recording Payment Form States
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "online_payment">("cash");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  
  // Void modal states
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const canManage = hasPermission(user.role, "finance:manage");

  // Filtering student fee accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesQ =
      !q ||
      acc.student_name.toLowerCase().includes(q.toLowerCase()) ||
      acc.admission_number.toLowerCase().includes(q.toLowerCase());
    const matchesClass = classId === "all" || acc.class_id === classId;
    const matchesStatus = status === "all" || acc.payment_status === status;

    return matchesQ && matchesClass && matchesStatus;
  });

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);
  
  // Filter payments for selected account
  const selectedPayments = payments.filter((p) => p.student_fee_account_id === selectedAccountId);

  async function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!selectedAccount) return;

    const remaining = Number(selectedAccount.remaining_balance);
    const payAmount = Number(amount);

    if (payAmount <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }

    if (payAmount > remaining) {
      setFormError(`Amount cannot exceed remaining balance of $${remaining}`);
      return;
    }

    const formData = new FormData();
    formData.append("student_fee_account_id", selectedAccount.id);
    formData.append("amount", amount);
    formData.append("payment_method", paymentMethod);
    formData.append("transaction_number", transactionNumber);
    formData.append("reference_number", referenceNumber);
    formData.append("remarks", remarks);

    startTransition(async () => {
      try {
        await recordPaymentAction(formData);
        setAmount("");
        setTransactionNumber("");
        setReferenceNumber("");
        setRemarks("");
      } catch (err: any) {
        setFormError(err.message || "Failed to record payment.");
      }
    });
  }

  async function handleVoidPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVoidError(null);

    if (!voidingPaymentId) return;

    if (voidReason.length < 4) {
      setVoidError("Void reason must be at least 4 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await voidPaymentAction(voidingPaymentId, voidReason);
        setVoidingPaymentId(null);
        setVoidReason("");
      } catch (err: any) {
        setVoidError(err.message || "Failed to void payment.");
      }
    });
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Student List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4">
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                  placeholder="Search student or adm..."
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatClassDisplayName(c.grade_name, c.name, c.section_name)}
                    </option>
                  ))}
                </Select>

                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </Select>
              </div>
            </div>
          </Card>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {filteredAccounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    setFormError(null);
                  }}
                  className={`w-full rounded-lg p-4 text-left border transition ${
                    isSelected
                      ? "border-primary bg-primary-soft/30 shadow-soft"
                      : "border-outline bg-white hover:bg-surface-low"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-ink">{acc.student_name}</p>
                      <p className="text-xs text-muted">Adm: {acc.admission_number}</p>
                    </div>
                    <Badge tone={statusTone[acc.payment_status as keyof typeof statusTone] ?? "gray"}>
                      {acc.payment_status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{formatGradeSection(acc.grade_name, acc.section_name)}</span>
                    <span className="font-bold text-ink">Remaining: ${Number(acc.remaining_balance).toLocaleString()}</span>
                  </div>
                </button>
              );
            })}

            {!filteredAccounts.length && (
              <div className="py-8 text-center text-sm text-muted bg-white border border-outline rounded-lg">
                No student accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ledger & Recording Form */}
        <div className="lg:col-span-7">
          {!selectedAccount ? (
            <Card className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center border border-dashed border-outline/80 bg-white">
              <Info className="h-8 w-8 text-muted mb-2" />
              <p className="font-semibold text-ink">No Student Selected</p>
              <p className="text-sm text-muted">Select a student from the list to record payments, view receipt history, and analyze ledger.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Student Ledger Overview */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedAccount.student_name}</CardTitle>
                      <p className="text-xs text-muted">Admission No: {selectedAccount.admission_number} • Class: {formatGradeSection(selectedAccount.grade_name, selectedAccount.section_name)}</p>
                    </div>
                    <Badge tone={statusTone[selectedAccount.payment_status as keyof typeof statusTone] ?? "gray"}>
                      {selectedAccount.payment_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3 bg-surface-low rounded-lg p-4">
                    <div>
                      <span className="text-xxs font-bold text-muted uppercase tracking-wider">Final Payable</span>
                      <p className="text-lg font-bold text-ink">${Number(selectedAccount.total_payable).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-xxs font-bold text-muted uppercase tracking-wider">Amount Paid</span>
                      <p className="text-lg font-bold text-success">${Number(selectedAccount.amount_paid).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-xxs font-bold text-muted uppercase tracking-wider">Remaining Balance</span>
                      <p className="text-lg font-bold text-danger">${Number(selectedAccount.remaining_balance).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>Academic Session: <strong className="text-ink">{selectedAccount.academic_year_name}</strong></span>
                    <span>Due Date: <strong className="text-ink">{format(new Date(selectedAccount.due_date), "MMM d, yyyy")}</strong></span>
                  </div>
                </CardContent>
              </Card>

              {/* Record Payment Installment */}
              {Number(selectedAccount.remaining_balance) > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Record Installment Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRecordPayment} className="space-y-4">
                      {formError && (
                        <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
                          {formError}
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Amount to Collect ($)">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 500"
                            required
                          />
                        </Field>

                        <Field label="Payment Method">
                          <Select
                            value={paymentMethod}
                            onChange={(e: any) => setPaymentMethod(e.target.value)}
                          >
                            <option value="cash">Cash Payment</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque Payment</option>
                            <option value="online_payment">Online Payment Gateway</option>
                          </Select>
                        </Field>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Transaction Number (Optional)">
                          <Input
                            value={transactionNumber}
                            onChange={(e) => setTransactionNumber(e.target.value)}
                            placeholder="e.g. TXN-12345"
                          />
                        </Field>

                        <Field label="Reference Number (Optional)">
                          <Input
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="e.g. REF-67890"
                          />
                        </Field>
                      </div>

                      <Field label="Remarks / Memo (Optional)">
                        <Textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Note on installment period, scholarship details, etc."
                        />
                      </Field>

                      <button
                        type="submit"
                        disabled={pending}
                        className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white shadow-soft hover:brightness-105"
                      >
                        {pending ? "Recording..." : "Post Transaction"}
                      </button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-success-soft/30 border border-success/30 p-6 flex flex-col items-center justify-center text-center rounded-lg">
                  <CheckCircle className="h-10 w-10 text-success mb-2" />
                  <p className="font-bold text-success">Account Fully Settled</p>
                  <p className="text-sm text-muted">This student has no remaining balance for the academic session.</p>
                </Card>
              )}

              {/* Installment History list */}
              <Card>
                <CardHeader>
                  <CardTitle>Installment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedPayments.length ? (
                    <div className="py-4 text-center text-sm text-muted">No payments recorded for this account.</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPayments.map((p) => (
                        <div
                          key={p.id}
                          className={`rounded-lg border p-4 transition ${
                            p.is_voided ? "border-outline bg-surface-low opacity-60" : "border-outline bg-white"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-ink">{p.receipt_number}</span>
                                {p.is_voided && <Badge tone="red">Voided</Badge>}
                              </div>
                              <p className="text-xs text-muted mt-0.5">
                                Method: <span className="font-semibold text-ink">{p.payment_method.replace("_", " ")}</span>
                                {p.transaction_number && ` • Txn: ${p.transaction_number}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${p.is_voided ? "text-muted line-through" : "text-success"}`}>
                                ${Number(p.amount).toLocaleString()}
                              </p>
                              <p className="text-xxs text-muted mt-0.5">
                                {format(new Date(p.payment_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          {p.remarks && <p className="mt-2 text-xs italic text-muted">Memo: &quot;{p.remarks}&quot;</p>}
                          
                          <div className="mt-3 pt-3 border-t border-outline/40 flex justify-between items-center text-xxs text-muted">
                            <span>Collected By: {p.received_by_name}</span>
                            <div className="flex items-center gap-2">
                              <Link href="/finance/fees" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                                <Receipt className="h-3 w-3" /> View Receipt
                              </Link>
                              {canManage && !p.is_voided && (
                                <button
                                  onClick={() => setVoidingPaymentId(p.id)}
                                  className="inline-flex items-center gap-1 font-bold text-danger hover:underline ml-2"
                                >
                                  <Trash2 className="h-3 w-3" /> Void
                                </button>
                              )}
                            </div>
                          </div>

                          {p.is_voided && (
                            <div className="mt-2 rounded bg-danger-soft/20 border border-danger/10 p-2 text-xxs text-danger">
                              <strong>Void details:</strong> {p.void_reason} (By: {p.voided_by_name} on {format(new Date(p.voided_at), "MMM d, yyyy")})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Void payment dialog */}
      {voidingPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between border-b border-outline/40 p-4">
              <h3 className="text-lg font-bold text-ink">Void Transaction</h3>
              <button onClick={() => setVoidingPaymentId(null)} className="rounded p-1 hover:bg-surface-low text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleVoidPayment}>
              <div className="space-y-4 p-4">
                {voidError && (
                  <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
                    {voidError}
                  </div>
                )}
                
                <p className="text-sm text-muted">
                  Voiding this payment will subtract its amount from the student&apos;s paid total and restore their remaining balance. This action is irreversible.
                </p>

                <Field label="Reason for Voiding">
                  <Textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Specify the reason (e.g. check bounced, duplicate entry, incorrect amount)..."
                    required
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-outline/40 p-4">
                <button
                  type="button"
                  onClick={() => setVoidingPaymentId(null)}
                  className="rounded-lg bg-surface-low px-4 py-2 text-sm font-semibold text-muted hover:bg-outline/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:bg-outline"
                >
                  {pending ? "Processing..." : "Confirm Void"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
