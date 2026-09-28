"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle, Edit3, RotateCcw, UsersRound, X } from "lucide-react";
import { saveStaffPayAction, setStaffPayStatusAction } from "@/app/(app)/finance/payroll/actions";
import type { StaffPayRow } from "@/lib/services/payroll";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/form-field";
import { formatDatePK, formatPKR } from "@/lib/utils";
import { StudentPagination } from "@/components/students/student-pagination";

type Props = {
  rows: StaffPayRow[];
  month: string;
  canManage: boolean;
  pagination?: { count: number; page: number; pageSize: number };
};

export function StaffPayTable({ rows, month, canManage, pagination }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffPayRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatus(row: StaffPayRow, status: "paid" | "unpaid") {
    setActionError(null);
    setPendingStaffId(row.staffId);
    startTransition(async () => {
      const res = await setStaffPayStatusAction(row.staffId, month, status);
      setPendingStaffId(null);
      if (res.error) {
        setActionError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function renderActions(row: StaffPayRow) {
    return (
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => setEditing(row)}
          disabled={row.status === "paid"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Edit pay for ${row.name}`}
          title="Edit pay"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
        </button>
        {row.status === "paid" ? (
          <button
            type="button"
            disabled={isPending && pendingStaffId === row.staffId}
            onClick={() => handleStatus(row, "unpaid")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning transition hover:brightness-95 disabled:opacity-50"
            aria-label={`Mark ${row.name} unpaid`}
            title="Mark unpaid"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            disabled={(isPending && pendingStaffId === row.staffId) || row.baseSalary <= 0}
            onClick={() => handleStatus(row, "paid")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success transition hover:brightness-95 disabled:opacity-50"
            aria-label={`Mark ${row.name} paid`}
            title="Mark paid"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {actionError ? <div className="mb-4 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{actionError}</div> : null}
      <Card className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />Staff Pay</h2>
          {pagination ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{pagination.count} employee{pagination.count === 1 ? "" : "s"}</span> : null}
        </div>
        <CardContent className="p-0">
          {!rows.length ? (
            <div className="p-5"><EmptyState title="No active staff found" description="Active employees will appear here for payroll." /></div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 p-4 lg:hidden">
                {rows.map((row) => (
                  <article key={row.staffId} className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="min-w-0 border-b border-outline/60 pb-3">
                      <h2 className="truncate font-semibold text-ink" title={row.name}>{row.name}</h2>
                      <p className="truncate text-xs capitalize text-muted">{row.jobTitle || row.role.replace("_", " ")}</p>
                      {row.email ? <p className="truncate text-xs text-muted" title={row.email}>{row.email}</p> : null}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 py-2 text-sm">
                      {[
                        ["Base salary", row.baseSalary > 0 ? formatPKR(row.baseSalary) : "Not set"],
                        ["Bonus", formatPKR(row.bonus)],
                        ["Deduction", formatPKR(row.deduction)],
                        ["Net salary", row.baseSalary > 0 ? formatPKR(row.netSalary) : "-"],
                        ["Paid this year", formatPKR(row.yearlyPaidTotal)],
                        ["Payment date", row.paymentDate ? formatDatePK(row.paymentDate) : "-"],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-lg bg-surface-low p-2">
                          <dt className="text-xs text-muted">{label}</dt>
                          <dd className="mt-1 break-words font-semibold tabular-nums text-ink">{value}</dd>
                        </div>
                      ))}
                      <div className="min-w-0 p-2">
                        <dt className="text-xs text-muted">Status</dt>
                        <dd className="mt-1"><Badge tone={row.status === "paid" ? "green" : "amber"}>{row.status === "paid" ? "PAID" : "UNPAID"}</Badge></dd>
                      </div>
                    </dl>
                    {canManage ? <div className="mt-4 border-t border-outline/60 pt-4">{renderActions(row)}</div> : null}
                  </article>
                ))}
              </div>
              <div className="student-table-scroll hidden max-w-full overflow-x-auto lg:block" data-responsive-table="desktop" role="region" aria-label="Staff payroll" tabIndex={0}>
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Base salary</th>
                      <th className="px-6 py-4">Bonus</th>
                      <th className="px-6 py-4">Deduction</th>
                      <th className="px-6 py-4">Net salary</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Paid this year</th>
                      <th className="px-6 py-4">Payment date</th>
                      {canManage ? <th className="px-6 py-4 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.staffId} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                        <td className="max-w-[220px] px-6 py-5">
                          <p className="truncate font-semibold text-ink" title={row.name}>{row.name}</p>
                          <p className="truncate text-xs capitalize text-muted">{row.jobTitle || row.role.replace("_", " ")}</p>
                          {row.email ? <p className="truncate text-xs text-muted" title={row.email}>{row.email}</p> : null}
                        </td>
                        <td className="px-6 py-5 font-semibold">{row.baseSalary > 0 ? formatPKR(row.baseSalary) : "Not set"}</td>
                        <td className="px-6 py-5 font-semibold text-success">{formatPKR(row.bonus)}</td>
                        <td className="px-6 py-5 font-semibold text-danger">{formatPKR(row.deduction)}</td>
                        <td className="px-6 py-5 font-bold text-ink">{row.baseSalary > 0 ? formatPKR(row.netSalary) : "-"}</td>
                        <td className="px-6 py-5">
                          <Badge tone={row.status === "paid" ? "green" : "amber"}>{row.status === "paid" ? "PAID" : "UNPAID"}</Badge>
                        </td>
                        <td className="px-6 py-5 font-semibold">{formatPKR(row.yearlyPaidTotal)}</td>
                        <td className="px-6 py-5 text-muted">{row.paymentDate ? formatDatePK(row.paymentDate) : "-"}</td>
                        {canManage ? (
                          <td className="px-6 py-5">
                            {renderActions(row)}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {pagination && rows.length ? <StudentPagination {...pagination} itemLabel="employees" /> : null}
        </CardContent>
      </Card>
      {editing ? (
        <StaffPayEditModal
          row={editing}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function StaffPayEditModal({
  row,
  month,
  onClose,
  onSaved
}: {
  row: StaffPayRow;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [baseSalary, setBaseSalary] = useState(String(row.baseSalary || ""));
  const [bonus, setBonus] = useState(String(row.bonus || 0));
  const [deduction, setDeduction] = useState(String(row.deduction || 0));
  const [remarks, setRemarks] = useState(row.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type="hidden"]), textarea') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const netSalary = useMemo(() => {
    return Math.max(0, Number(baseSalary || 0) + Number(bonus || 0) - Number(deduction || 0));
  }, [baseSalary, bonus, deduction]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await saveStaffPayAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
      }
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="staff-pay-edit-title" className="w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline/60 pb-4">
          <div className="min-w-0">
            <h2 id="staff-pay-edit-title" className="font-display text-xl font-bold text-ink">Edit Staff Pay</h2>
            <p className="mt-1 truncate text-sm text-muted" title={row.name}>{row.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close edit staff pay" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-low">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <input type="hidden" name="staff_id" value={row.staffId} />
          <input type="hidden" name="month" value={month} />
          {error ? <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
          <Field label="Base Salary">
            <Input name="base_salary" type="number" min="1" step="1" value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} required />
          </Field>
          <div className="grid gap-4">
            <Field label="Bonus">
              <Input name="bonus" type="number" min="0" step="1" value={bonus} onChange={(event) => setBonus(event.target.value)} />
            </Field>
            <Field label="Deduction">
              <Input name="deduction" type="number" min="0" step="1" value={deduction} onChange={(event) => setDeduction(event.target.value)} />
            </Field>
          </div>
          <Card className="bg-surface-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Net salary</p>
            <p className="mt-1 break-words font-display text-2xl font-bold text-ink">{formatPKR(netSalary)}</p>
          </Card>
          <Field label="Remarks">
            <Textarea name="remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
          <div className="flex flex-col gap-2 border-t border-outline/60 pt-4">
            <button type="button" onClick={onClose} className="min-h-11 w-full rounded-lg bg-surface-low px-4 py-2.5 text-sm font-semibold text-muted">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60">
              {isPending ? "Saving..." : "Save Pay"}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  );
}
