"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Percent, X, Printer, Receipt, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Select, Field, Textarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  applyDiscountAction,
  recordPaymentAction,
} from "@/app/(app)/finance/actions";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { formatPKR, formatDatePK, formatGradeSection } from "@/lib/utils";

interface FeeManagementClientProps {
  user: AppUser;
  accounts: any[];
  classes: any[];
  sessions: any[];
  payments: any[];
}

const statusTone = {
  paid: "green",
  partially_paid: "blue",
  unpaid: "yellow",
  overdue: "red"
} as const;

function canViewFinancialReports(role: string) {
  return role !== "administrator";
}

export function FeeManagementClient({ user, accounts, classes, sessions, payments }: FeeManagementClientProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [status, setStatus] = useState("all");
  const [session, setSession] = useState("all");
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "online_payment">("cash");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | "none">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState<"scholarship" | "sibling_discount" | "merit" | "need_based" | "special_approval">("scholarship");
  const [discountRemarks, setDiscountRemarks] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const canManage = hasPermission(user.role, "finance:manage", user.permissions);
  const showReports = canViewFinancialReports(user.role);

  const latestReceiptByAccount = useMemo(() => {
    const map = new Map<string, any>();
    for (const payment of payments) {
      if (payment.is_voided) continue;
      if (!map.has(payment.student_fee_account_id)) {
        map.set(payment.student_fee_account_id, payment);
      }
    }
    return map;
  }, [payments]);

  const filtered = accounts.filter((acc) => {
    const matchesQ =
      !q ||
      acc.student_name.toLowerCase().includes(q.toLowerCase()) ||
      acc.admission_number.toLowerCase().includes(q.toLowerCase());
    const matchesClass = classId === "all" || acc.class_id === classId;
    const matchesStatus = status === "all" || acc.payment_status === status;
    const matchesSession = session === "all" || acc.academic_year_id === session;
    const matchesDiscount = !onlyDiscounted || acc.discount_type !== "none";
    return matchesQ && matchesClass && matchesStatus && matchesSession && matchesDiscount;
  });

  const selectedLedgerAccount = accounts.find((acc) => acc.id === selectedAccountId) ?? null;
  const totals = filtered.reduce(
    (acc, row) => ({
      payable: acc.payable + Number(row.total_payable || 0),
      paid: acc.paid + Number(row.amount_paid || 0),
      outstanding: acc.outstanding + Number(row.remaining_balance || 0)
    }),
    { payable: 0, paid: 0, outstanding: 0 }
  );
  function handleOpenDiscount(acc: any) {
    setSelectedAccount(acc);
    setDiscountType(acc.discount_type);
    setDiscountValue(acc.discount_type === "none" ? "" : String(acc.discount_value ?? ""));
    setDiscountReason(acc.discount_reason || "scholarship");
    setDiscountRemarks(acc.discount_remarks || "");
    setError(null);
    setIsDiscountOpen(true);
  }

  async function handleApplyDiscount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.append("discount_type", discountType);
    formData.append("discount_value", discountValue.trim() === "" ? "0" : discountValue);
    formData.append("discount_reason", discountReason);
    formData.append("discount_remarks", discountRemarks);
    formData.append("discount_approved_by", user.fullName);

    startTransition(async () => {
      try {
        await applyDiscountAction(selectedAccount.id, formData);
        setIsDiscountOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to apply discount.");
      }
    });
  }

  async function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!selectedLedgerAccount) return;

    const remaining = Number(selectedLedgerAccount.remaining_balance);
    const payAmount = Number(amount);
    if (payAmount <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }
    if (payAmount > remaining) {
      setFormError(`Amount cannot exceed remaining balance of ${formatPKR(remaining)}`);
      return;
    }

    const formData = new FormData();
    formData.append("student_fee_account_id", selectedLedgerAccount.id);
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
        router.refresh();
      } catch (err: any) {
        setFormError(err.message || "Failed to record payment.");
      }
    });
  }

  return (
    <>
      <div id="fee-management-report" className="pb-24">
        <Card className="mb-6 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline/50 pb-4">
            <div>
              <p className="text-sm font-semibold text-ink">Fee ledger</p>
              <p className="text-xs text-muted">Search, filter, collect payments, and apply discounts.</p>
            </div>
            {showReports ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadReport(filtered)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary ring-1 ring-outline hover:bg-primary-soft"
                >
                  <Download className="h-4 w-4" /> Download Report
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search student or admission..." />
            </div>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade_name} • {c.name}
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
            <Select value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={onlyDiscounted}
              onChange={(e) => setOnlyDiscounted(e.target.checked)}
              className="h-4 w-4 rounded border-outline text-primary focus:ring-0"
            />
            <span>Show discounted accounts only</span>
          </label>
        </Card>

        {showReports ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Expected Billing</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{formatPKR(totals.payable)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Collected</p>
              <p className="mt-1 font-display text-2xl font-bold text-success">{formatPKR(totals.paid)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Outstanding</p>
              <p className="mt-1 font-display text-2xl font-bold text-danger">{formatPKR(totals.outstanding)}</p>
            </Card>
          </div>
        ) : null}

        {!filtered.length ? (
          <EmptyState title="No fee accounts found" description="Try adjusting your search or filter criteria." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-outline bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Payable</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Receipt</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc) => {
                  const receipt = latestReceiptByAccount.get(acc.id);
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <tr
                      key={acc.id}
                      className={`border-t border-outline/60 ${isSelected ? "bg-primary-soft/40" : "hover:bg-surface-low/70"}`}
                    >
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setSelectedAccountId(acc.id)} className="text-left">
                          <p className="font-semibold text-ink">{acc.student_name}</p>
                          <p className="text-xs text-muted">Adm: {acc.admission_number}</p>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-muted">{formatGradeSection(acc.grade_name, acc.section_name)}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold">{formatPKR(Number(acc.total_payable))}</td>
                      <td className="px-4 py-4 font-semibold text-success">{formatPKR(Number(acc.amount_paid))}</td>
                      <td className="px-4 py-4 font-bold text-danger">{formatPKR(Number(acc.remaining_balance))}</td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone[acc.payment_status as keyof typeof statusTone] ?? "gray"}>
                          {acc.payment_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {receipt ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                          >
                            <Receipt className="h-3.5 w-3.5" /> View/Print
                          </button>
                        ) : (
                          <span className="text-xs text-muted">No receipt yet</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAccountId(acc.id)}
                              className="inline-flex items-center gap-1 rounded bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary hover:brightness-95"
                            >
                              <Wallet className="h-3 w-3" /> Collect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDiscount(acc)}
                              className="inline-flex items-center gap-1 rounded bg-success-soft px-2.5 py-1 text-xs font-bold text-success hover:brightness-95"
                            >
                              <Percent className="h-3 w-3" /> Discount
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedLedgerAccount && canManage && Number(selectedLedgerAccount.remaining_balance) > 0 ? (
          <Card className="mt-6 p-5">
            <h3 className="font-display text-lg font-bold text-ink">Record Payment — {selectedLedgerAccount.student_name}</h3>
            <p className="mt-1 text-sm text-muted">
              Remaining balance: {formatPKR(Number(selectedLedgerAccount.remaining_balance))}
            </p>
            <form onSubmit={handleRecordPayment} className="mt-4 grid gap-4 md:grid-cols-2">
              {formError ? (
                <div className="md:col-span-2 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{formError}</div>
              ) : null}
              <Field label="Amount">
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Payment Method">
                <Select value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online_payment">Online Payment</option>
                </Select>
              </Field>
              <Field label="Transaction Number">
                <Input value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} />
              </Field>
              <Field label="Reference Number">
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Remarks">
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-105 disabled:bg-outline"
                >
                  {pending ? "Recording..." : "Post Payment"}
                </button>
              </div>
            </form>
          </Card>
        ) : null}
      </div>

      {showReports ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline/70 bg-white/95 px-4 py-3 backdrop-blur print:hidden lg:pl-[280px]">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Showing {filtered.length} account{filtered.length === 1 ? "" : "s"} • Outstanding {formatPKR(totals.outstanding)}
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-button hover:brightness-105"
            >
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        </div>
      ) : null}

      {isDiscountOpen && selectedAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between border-b border-outline/40 p-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Apply Fee Discount</h3>
                <p className="text-xs text-muted">Student: {selectedAccount.student_name}</p>
              </div>
              <button onClick={() => setIsDiscountOpen(false)} className="rounded p-1 hover:bg-surface-low text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleApplyDiscount}>
              <div className="space-y-4 p-4">
                {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
                <Field label="Discount Type">
                  <Select
                    value={discountType}
                    onChange={(e) => {
                      setDiscountType(e.target.value as any);
                      if (e.target.value === "none") setDiscountValue("");
                    }}
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Amount Discount</option>
                  </Select>
                </Field>
                {discountType !== "none" ? (
                  <>
                    <Field label={discountType === "percentage" ? "Percentage Value (%)" : "Fixed Amount"}>
                      <Input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                    </Field>
                    <Field label="Reason">
                      <Select value={discountReason} onChange={(e) => setDiscountReason(e.target.value as any)}>
                        <option value="scholarship">Scholarship Program</option>
                        <option value="sibling_discount">Sibling Discount</option>
                        <option value="merit">Academic Merit</option>
                        <option value="need_based">Need-Based Financial Aid</option>
                        <option value="special_approval">Special Board Approval</option>
                      </Select>
                    </Field>
                    <Field label="Remarks">
                      <Textarea value={discountRemarks} onChange={(e) => setDiscountRemarks(e.target.value)} />
                    </Field>
                  </>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-outline/40 p-4">
                <button type="button" onClick={() => setIsDiscountOpen(false)} className="rounded-lg bg-surface-low px-4 py-2 text-sm font-semibold text-muted">
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white">
                  {pending ? "Saving..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {selectedReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
          <Card className="w-full max-w-2xl p-6 print:shadow-none print:ring-0">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-outline/60 pb-4 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-ink">Payment Receipt</h3>
                <p className="text-xs text-muted">{selectedReceipt.receipt_number}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                  Print
                </button>
                <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-muted">
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-primary">Fee Receipt</h2>
                  <p className="text-muted">Official payment record</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-ink">{selectedReceipt.receipt_number}</p>
                  <p className="text-muted">{formatDatePK(selectedReceipt.payment_date)}</p>
                </div>
              </div>
              <div className="grid gap-3 rounded-lg bg-surface-low p-4 sm:grid-cols-2">
                <ReceiptLine label="Student" value={selectedReceipt.student_name} />
                <ReceiptLine label="Admission" value={selectedReceipt.admission_number} />
                <ReceiptLine label="Class" value={formatGradeSection(selectedReceipt.grade_name, selectedReceipt.section_name)} />
                <ReceiptLine label="Session" value={selectedReceipt.academic_year_name} />
              </div>
              <div className="grid gap-3 rounded-lg border border-outline/60 p-4 sm:grid-cols-2">
                <ReceiptLine label="Amount Paid" value={formatPKR(Number(selectedReceipt.amount))} strong />
                <ReceiptLine label="Method" value={selectedReceipt.payment_method.replace("_", " ")} />
                <ReceiptLine label="Reference" value={selectedReceipt.reference_number || selectedReceipt.transaction_number || "-"} />
                <ReceiptLine label="Received By" value={selectedReceipt.received_by_name || "-"} />
              </div>
              {selectedReceipt.remarks ? <p className="text-muted">Remarks: {selectedReceipt.remarks}</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function downloadReport(rows: any[]) {
  const headers = ["Student", "Admission", "Class", "Payable", "Paid", "Remaining", "Status"];
  const body = rows.map((row) => [
    row.student_name,
    row.admission_number,
    formatGradeSection(row.grade_name, row.section_name),
    row.total_payable,
    row.amount_paid,
    row.remaining_balance,
    row.payment_status
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "fee-management-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ReceiptLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={strong ? "mt-1 font-display text-xl font-bold text-ink" : "mt-1 font-semibold text-ink"}>{value}</p>
    </div>
  );
}
