"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Edit3, RotateCcw, X } from "lucide-react";
import { saveStaffPayAction, setStaffPayStatusAction } from "@/app/(app)/finance/payroll/actions";
import type { StaffPayRow } from "@/lib/services/payroll";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/form-field";
import { formatDatePK, formatPKR } from "@/lib/utils";

type Props = {
  rows: StaffPayRow[];
  month: string;
  canManage: boolean;
};

export function StaffPayTable({ rows, month, canManage }: Props) {
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

  return (
    <>
      {actionError ? <div className="mb-4 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{actionError}</div> : null}
      <Card>
        <CardContent className="p-0">
          {!rows.length ? (
            <EmptyState title="No active staff found" description="Active employees will appear here for payroll." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Base salary</th>
                    <th className="px-4 py-3">Bonus</th>
                    <th className="px-4 py-3">Deduction</th>
                    <th className="px-4 py-3">Net salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid this year</th>
                    <th className="px-4 py-3">Payment date</th>
                    {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.staffId} className="border-t border-outline/60 hover:bg-surface-low/70">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-ink">{row.name}</p>
                        <p className="text-xs capitalize text-muted">{row.jobTitle || row.role.replace("_", " ")}</p>
                        {row.email ? <p className="text-xs text-muted">{row.email}</p> : null}
                      </td>
                      <td className="px-4 py-4 font-semibold">{row.baseSalary > 0 ? formatPKR(row.baseSalary) : "Not set"}</td>
                      <td className="px-4 py-4 font-semibold text-success">{formatPKR(row.bonus)}</td>
                      <td className="px-4 py-4 font-semibold text-danger">{formatPKR(row.deduction)}</td>
                      <td className="px-4 py-4 font-bold text-ink">{row.baseSalary > 0 ? formatPKR(row.netSalary) : "-"}</td>
                      <td className="px-4 py-4">
                        <Badge tone={row.status === "paid" ? "green" : "yellow"}>{row.status === "paid" ? "Paid" : "Unpaid"}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold">{formatPKR(row.yearlyPaidTotal)}</td>
                      <td className="px-4 py-4 text-muted">{row.paymentDate ? formatDatePK(row.paymentDate) : "-"}</td>
                      {canManage ? (
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(row)}
                              disabled={row.status === "paid"}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-ink ring-1 ring-outline hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                            {row.status === "paid" ? (
                              <button
                                type="button"
                                disabled={isPending && pendingStaffId === row.staffId}
                                onClick={() => handleStatus(row, "unpaid")}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-warning px-3 text-xs font-semibold text-white hover:brightness-105 disabled:opacity-60"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Mark Unpaid
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={(isPending && pendingStaffId === row.staffId) || row.baseSalary <= 0}
                                onClick={() => handleStatus(row, "paid")}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-xs font-semibold text-white hover:brightness-105 disabled:opacity-60"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-[0_32px_80px_rgba(27,28,29,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-outline/60 p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Edit Staff Pay</h2>
            <p className="mt-1 text-sm text-muted">{row.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-low">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <input type="hidden" name="staff_id" value={row.staffId} />
          <input type="hidden" name="month" value={month} />
          {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
          <Field label="Base Salary">
            <Input name="base_salary" type="number" min="1" step="1" value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bonus">
              <Input name="bonus" type="number" min="0" step="1" value={bonus} onChange={(event) => setBonus(event.target.value)} />
            </Field>
            <Field label="Deduction">
              <Input name="deduction" type="number" min="0" step="1" value={deduction} onChange={(event) => setDeduction(event.target.value)} />
            </Field>
          </div>
          <Card className="bg-surface-low p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Net salary</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{formatPKR(netSalary)}</p>
          </Card>
          <Field label="Remarks">
            <Textarea name="remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-outline/60 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-surface-low px-4 py-2 text-sm font-semibold text-muted">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60">
              {isPending ? "Saving..." : "Save Pay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
