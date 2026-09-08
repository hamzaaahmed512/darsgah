"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input, Select, Field, Textarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { applyDiscountAction, editFeeChallanAction, recordPaymentAction, assignLegacyPaymentAction } from "@/app/(app)/finance/actions";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { formatClassDisplayName, formatPKR, formatDatePK } from "@/lib/utils";
import { challanStatusLabels, filterChallans, type Challan, type ChallanPayment, type UnassignedPayment } from "@/lib/challans";

type Mode = "view" | "collect" | "discount" | "edit";
const button = "rounded-lg border border-outline px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-soft disabled:opacity-40";
const initialFilters = { q: "", classId: "", session: "", status: "", from: "", to: "" };

export function FeeManagementClient({ user, challans, classes, sessions, unassignedPayments = [] }: {
  user: AppUser; challans: Challan[];
  unassignedPayments?: UnassignedPayment[];
  classes: { id: string; grade_name?: string; name: string; section_name?: string | null }[];
  sessions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<{ id: string; mode: Mode; updatedAt: string } | null>(null);
  const [receipt, setReceipt] = useState<ChallanPayment | null>(null);
  const [items, setItems] = useState<Challan["line_items"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canManage = hasPermission(user.role, "finance:manage", user.permissions);
  const row = challans.find(c => c.id === selected?.id);
  const legacyPayments = unassignedPayments.filter(p => p.student_fee_account_id === row?.student_fee_account_id);
  const filtered = filterChallans(challans, filters);
  const invalidDates = !!filters.from && !!filters.to && filters.from > filters.to;
  function filter(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); }
  function open(c: Challan, mode: Mode) {
    setSelected({ id: c.id, mode, updatedAt: c.updated_at }); setReceipt(null); setError(null);
    setItems(c.line_items.map(i => ({ ...i, amount: Number(i.amount) })));
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row || !selected || pending) return;
    const data = new FormData(event.currentTarget);
    data.set("challan_id", row.id); data.set("updated_at", selected.updatedAt);
    data.set("line_items", JSON.stringify(items));
    const id = row.id, mode = selected.mode;
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "collect") await recordPaymentAction(data);
        if (mode === "discount") await applyDiscountAction(id, data);
        if (mode === "edit") await editFeeChallanAction(id, data);
        setSelected(null); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Unable to save challan"); }
    });
  }
  return <>
    <Card className="overflow-hidden print:hidden">
      <div className="space-y-4 border-b border-outline p-5">
        <h2 className="text-xl font-bold">Challan List</h2>
        {unassignedPayments.length > 0 && <p className="text-sm text-muted">Historical payments need challan assignment. Open the relevant challan to review and assign a receipt; unassigned payments are not included in its balance.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Student / Admission / Challan Search"><Input aria-label="Search challans" value={filters.q} onChange={e => filter("q", e.target.value)} placeholder="Search issued challans" /></Field>
          <Field label="Challan Status"><Select aria-label="Challan Status" value={filters.status} onChange={e => filter("status", e.target.value)}><option value="">All Statuses</option>{Object.entries(challanStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Class"><Select aria-label="Class" value={filters.classId} onChange={e => filter("classId", e.target.value)}><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{formatClassDisplayName(c.grade_name, c.name, c.section_name)}</option>)}</Select></Field>
          <Field label="Session"><Select aria-label="Session" value={filters.session} onChange={e => filter("session", e.target.value)}><option value="">All Sessions</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Issue Date From"><Input aria-label="Issue Date From" type="date" value={filters.from} onChange={e => filter("from", e.target.value)} /></Field>
          <Field label="Issue Date To"><Input aria-label="Issue Date To" type="date" min={filters.from} value={filters.to} onChange={e => filter("to", e.target.value)} /></Field>
          <div className="flex items-end"><button className={button} onClick={() => setFilters(initialFilters)}>Clear Filters</button></div>
        </div>
        {invalidDates && <p role="alert" className="text-sm text-danger">End date must be on or after the start date.</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-low text-xs uppercase text-muted"><tr>{["Challan ID", "Student / Admission ID", "Class", "Issue / Due Date", "Total Amount", "Amount Paid", "Balance Due", "Challan Status", "Actions"].map(h => <th key={h} className="px-4 py-4">{h}</th>)}</tr></thead>
          <tbody>{!invalidDates && filtered.map(c => <tr key={c.id} className="border-t border-outline/60 hover:bg-surface-low/40">
            <td className="max-w-48 break-all px-4 py-4 font-mono text-xs"><button className="text-left text-primary underline" onClick={() => open(c, "view")}>{c.id}</button></td>
            <td className="px-4 py-4"><p className="font-semibold">{c.student_name}</p><p className="text-xs text-muted">{c.admission_number}</p></td>
            <td className="px-4 py-4">{c.class_name}</td>
            <td className="whitespace-nowrap px-4 py-4"><p>Issued {formatDatePK(c.issue_date)}</p><p className="text-xs text-muted">Due {formatDatePK(c.due_date)}</p></td>
            <td className="whitespace-nowrap px-4 py-4">{formatPKR(c.amount)}</td><td className="whitespace-nowrap px-4 py-4 text-success">{formatPKR(c.amount_paid)}</td><td className="whitespace-nowrap px-4 py-4 font-semibold">{formatPKR(c.balance_due)}</td>
            <td className="px-4 py-4"><Badge tone={c.payment_status === "paid" ? "green" : c.payment_status === "unpaid" ? "yellow" : "blue"}>{challanStatusLabels[c.payment_status]}</Badge></td>
            <td className="px-4 py-4"><div className="flex min-w-56 flex-wrap gap-2"><button className={button} onClick={() => open(c, "view")}>View / Receipts</button>{canManage && <>
              <button className={button} disabled={c.balance_due <= 0 || !c.student_fee_account_id} onClick={() => open(c, "collect")}>Collect Payment</button>
              <button className={button} onClick={() => open(c, "discount")}>Apply Discount</button><button className={button} onClick={() => open(c, "edit")}>Edit</button>
            </>}</div></td>
          </tr>)}{(invalidDates || !filtered.length) && <tr><td colSpan={9} className="p-8 text-center text-muted">No challans match these filters.</td></tr>}</tbody>
        </table>
      </div>
    </Card>
    {row && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:block print:bg-white print:p-0">
      <section role="dialog" aria-modal="true" aria-label="Challan details" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl print:max-h-none print:shadow-none" id="challan-document">
        <div className="mb-4 flex justify-between gap-3 print:hidden"><h2 className="text-lg font-bold">{selected.mode === "view" ? receipt ? "Payment Receipt" : "Challan Details" : selected.mode === "collect" ? "Collect Payment" : selected.mode === "edit" ? "Edit Challan" : "Apply Discount"}</h2><button className={button} disabled={pending} onClick={() => setSelected(null)}>Close</button></div>
        <div className="mb-5 space-y-1 border-b border-outline pb-4"><p className="break-all font-mono text-sm">Challan ID: {row.id}</p><p className="font-bold">{row.student_name} · {row.admission_number}</p><p className="text-sm">{row.class_name} · {sessions.find(s => s.id === row.academic_year_id)?.name ?? "Session unavailable"}</p><p className="text-sm">Issued {formatDatePK(row.issue_date)} · Due {formatDatePK(row.due_date)}</p></div>
        {selected.mode === "view" ? <>
          {receipt ? <div className="space-y-3"><h3 className="text-xl font-bold">Receipt {receipt.receipt_number}</h3><p>{formatDatePK(receipt.payment_date)} · {receipt.payment_method.replaceAll("_", " ")}</p><p className="text-xl">Amount Paid: {formatPKR(receipt.amount)}</p><p>Reference: {receipt.reference_number || receipt.transaction_number || "—"}</p>{receipt.remarks && <p>{receipt.remarks}</p>}{receipt.is_voided && <p className="font-bold text-danger">VOIDED</p>}<button className={`${button} print:hidden`} onClick={() => setReceipt(null)}>Back to Challan</button></div> : <>
            <table className="w-full text-sm"><thead><tr><th className="py-2 text-left">Line Item</th><th className="text-right">Amount</th></tr></thead><tbody>{row.line_items.map((i, index) => <tr key={index} className="border-t border-outline"><td className="py-2">{i.description}</td><td className="text-right">{formatPKR(Number(i.amount))}</td></tr>)}</tbody></table>
            <div className="my-4 space-y-1 text-right text-sm"><p>Discount: {formatPKR(row.discount_amount)}</p>{row.discount_reason && <p>{row.discount_reason}</p>}<p>Total Amount: {formatPKR(row.amount)}</p><p>Amount Paid: {formatPKR(row.amount_paid)}</p><p className="font-bold">Balance Due: {formatPKR(row.balance_due)} · {challanStatusLabels[row.payment_status]}</p></div>
            <h3 className="mb-2 font-bold">Payment History</h3>{!row.payments.length && <p className="text-sm text-muted">No payments recorded for this challan.</p>}
            {legacyPayments.length > 0 && <div className="my-4 rounded-lg border border-outline p-3 print:hidden"><h4 className="font-semibold">Unassigned Historical Receipts</h4><p className="my-2 text-xs text-muted">Assign only a receipt that paid this challan. Receipts exceeding its balance need separate reconciliation.</p>{legacyPayments.map(p => <div key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{p.receipt_number} · {formatDatePK(p.payment_date)} · {formatPKR(p.amount)}</span>{canManage && <button className={button} disabled={pending || p.amount > row.balance_due} onClick={() => {
              setError(null);
              startTransition(async () => { try { await assignLegacyPaymentAction(row.id, p.id); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to assign receipt"); } });
            }}>Assign to This Challan</button>}</div>)}</div>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {row.payments.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-outline py-3 text-sm"><div><p>{p.receipt_number} · {formatDatePK(p.payment_date)}</p><p>{formatPKR(p.amount)} · {p.payment_method.replaceAll("_", " ")}{p.is_voided ? " · Voided" : ""}</p></div><button className={`${button} print:hidden`} onClick={() => setReceipt(p)}>View / Print Receipt</button></div>)}
          </>}
          <button className={`${button} mt-5 print:hidden`} onClick={() => window.print()}>Print {receipt ? "Receipt" : "Challan"}</button>
        </> : <form onSubmit={submit} className="space-y-4">
          <p className="text-sm">Challan total {formatPKR(row.amount)} · Paid {formatPKR(row.amount_paid)} · Balance {formatPKR(row.balance_due)}</p>
          {selected.mode === "collect" && <>
            <Field label="Payment Amount" required><Input name="amount" type="number" min="0.01" max={row.balance_due} step="0.01" required /></Field>
            <Field label="Payment Method"><Select name="payment_method"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="online_payment">Online Payment</option></Select></Field>
            <Field label="Reference Number"><Input name="reference_number" /></Field><Field label="Transaction Number"><Input name="transaction_number" /></Field><Field label="Remarks"><Textarea name="remarks" /></Field>
          </>}
          {selected.mode === "discount" && <><Field label="Discount Amount (PKR)" required><Input name="discount_amount" type="number" min="0" max={row.amount + row.discount_amount - row.amount_paid} step="0.01" defaultValue={row.discount_amount} required /></Field><p className="text-xs text-muted">Replaces this challan’s discount. Enter 0 to remove it.</p><Field label="Reason" required><Textarea name="discount_reason" defaultValue={row.discount_reason ?? ""} required /></Field></>}
          {selected.mode === "edit" && <>
            <Field label="Due Date" required><Input name="due_date" type="date" min={row.issue_date} defaultValue={row.due_date} required /></Field>
            {items.map((item, index) => <div key={index} className="flex items-end gap-2"><div className="flex-1"><Field label={`Line Item ${index + 1}`}><Input aria-label={`Line item ${index + 1} description`} value={item.description} required onChange={e => setItems(items.map((v, i) => i === index ? { ...v, description: e.target.value } : v))} /></Field></div><div className="w-32"><Field label="Amount"><Input aria-label={`Line item ${index + 1} amount`} type="number" min="0" step="0.01" value={item.amount} required onChange={e => setItems(items.map((v, i) => i === index ? { ...v, amount: Number(e.target.value) } : v))} /></Field></div><button type="button" className={button} disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove</button></div>)}
            <button type="button" className={button} onClick={() => setItems([...items, { description: "", amount: 0 }])}>Add Line Item</button>
          </>}
          {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <button disabled={pending} className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        </form>}
      </section>
      <style>{`@media print { body * { visibility: hidden; } #challan-document, #challan-document * { visibility: visible; } #challan-document { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>}
  </>;
}
