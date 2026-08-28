"use client";

import { useState, useTransition } from "react";
import { Search, Percent, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Select, Field, Textarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { applyDiscountAction } from "@/app/(app)/finance/actions";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { formatPKR, formatDatePK, formatGradeSection } from "@/lib/utils";

interface StudentFeesClientProps {
  user: AppUser;
  accounts: any[];
  classes: any[];
  sessions: any[];
}

const statusTone = {
  paid: "green",
  partially_paid: "blue",
  unpaid: "yellow",
  overdue: "red"
} as const;

export function StudentFeesClient({ user, accounts, classes, sessions }: StudentFeesClientProps) {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [status, setStatus] = useState("all");
  const [session, setSession] = useState("all");
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  // Discount Modal States
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | "none">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState<"scholarship" | "sibling_discount" | "merit" | "need_based" | "special_approval">("scholarship");
  const [discountRemarks, setDiscountRemarks] = useState("");

  const canManage = hasPermission(user.role, "finance:manage");

  // Filtering logic
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
      } catch (err: any) {
        setError(err.message || "Failed to apply discount.");
      }
    });
  }

  return (
    <>
      <Card className="mb-6 p-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              placeholder="Search student or adm..."
            />
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

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={onlyDiscounted}
              onChange={(e) => setOnlyDiscounted(e.target.checked)}
              className="h-4 w-4 rounded border-outline text-primary focus:ring-0"
            />
            <span>Show Discounted Only</span>
          </label>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState title="No Fee Accounts Found" description="Try a different search or filter option." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-outline bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Student info</th>
                <th className="px-4 py-3">Academic Session</th>
                <th className="px-4 py-3">Class / Section</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Final Payable</th>
                <th className="px-4 py-3">Amount Paid</th>
                <th className="px-4 py-3">Remaining Balance</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => {
                const discLabel =
                  acc.discount_type === "percentage"
                    ? `${acc.discount_value}%`
                    : acc.discount_type === "fixed"
                    ? formatPKR(acc.discount_value)
                    : "None";

                return (
                  <tr key={acc.id} className="border-t border-outline/60 hover:bg-surface-low/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{acc.student_name}</p>
                      <p className="text-xs text-muted">Adm: {acc.admission_number}</p>
                    </td>
                    <td className="px-4 py-4 text-muted">{acc.academic_year_name}</td>
                    <td className="px-4 py-4 font-semibold text-ink">
                      {formatGradeSection(acc.grade_name, acc.section_name)}
                    </td>
                    <td className="px-4 py-4">
                      {acc.discount_type !== "none" ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-success">{discLabel}</span>
                          <span className="text-xxs text-muted uppercase tracking-wider">
                            {acc.discount_reason?.replace("_", " ")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold">{formatPKR(Number(acc.total_payable))}</td>
                    <td className="px-4 py-4 font-semibold text-success">
                      {formatPKR(Number(acc.amount_paid))}
                    </td>
                    <td className="px-4 py-4 font-bold text-danger">
                      {formatPKR(Number(acc.remaining_balance))}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDatePK(acc.due_date)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={statusTone[acc.payment_status as keyof typeof statusTone] ?? "gray"}>
                        {acc.payment_status.replace("_", " ")}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleOpenDiscount(acc)}
                          className="inline-flex items-center gap-1 rounded bg-success-soft px-2.5 py-1 text-xs font-bold text-success hover:brightness-95"
                          title="Apply Discount Policy"
                        >
                          <Percent className="h-3 w-3" /> Discount
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Discount modal */}
      {isDiscountOpen && selectedAccount && (
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
                {error && (
                  <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
                    {error}
                  </div>
                )}

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
                    <option value="fixed">Fixed Amount Discount ($)</option>
                  </Select>
                </Field>

                {discountType !== "none" && (
                  <>
                    <Field label={discountType === "percentage" ? "Percentage Value (%)" : "Fixed Amount ($)"}>
                      <Input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </Field>

                    <Field label="Reason / Waiver Program">
                      <Select
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value as any)}
                      >
                        <option value="scholarship">Scholarship Program</option>
                        <option value="sibling_discount">Sibling Discount</option>
                        <option value="merit">Academic Merit</option>
                        <option value="need_based">Need-Based Financial Aid</option>
                        <option value="special_approval">Special Board Approval</option>
                      </Select>
                    </Field>

                    <Field label="Waiver Remarks / Details">
                      <Textarea
                        value={discountRemarks}
                        onChange={(e) => setDiscountRemarks(e.target.value)}
                        placeholder="Provide details about approval or background..."
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-outline/40 p-4">
                <button
                  type="button"
                  onClick={() => setIsDiscountOpen(false)}
                  className="rounded-lg bg-surface-low px-4 py-2 text-sm font-semibold text-muted hover:bg-outline/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:bg-outline"
                >
                  {pending ? "Saving..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
