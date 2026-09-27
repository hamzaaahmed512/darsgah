"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import {
  createFeeStructureAction,
  createFeeStructuresForClassesAction,
  deleteFeeStructureAction,
  updateFeeStructureAction
} from "@/app/(app)/finance/actions";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { formatClassDisplayName, formatPKR } from "@/lib/utils";

type Props = {
  user: AppUser;
  classes: any[];
  sessions: any[];
  structures: any[];
  initialOpen?: boolean;
};

export function FeeStructuresClient({ user, classes, sessions, structures, initialOpen = false }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(initialOpen);
  const [editing, setEditing] = useState<any | null>(null);
  const [scope, setScope] = useState<"one" | "all">("one");
  const [sessionId, setSessionId] = useState("");
  const [classId, setClassId] = useState("");
  const [tuition, setTuition] = useState("");
  const [admission, setAdmission] = useState("");
  const [exam, setExam] = useState("");
  const [library, setLibrary] = useState("");
  const [lab, setLab] = useState("");
  const [transport, setTransport] = useState("");
  const [misc, setMisc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canManage = hasPermission(user.role, "finance:manage", user.permissions);

  const total = [tuition, admission, exam, library, lab, transport, misc].reduce((sum, value) => sum + Number(value || 0), 0);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled])") ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, mounted]);

  function openCreate() {
    setEditing(null);
    setScope("one");
    setSessionId(sessions[0]?.id || "");
    setClassId(classes[0]?.id || "");
    setTuition("");
    setAdmission("");
    setExam("");
    setLibrary("");
    setLab("");
    setTransport("");
    setMisc("");
    setError(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!initialOpen) return;
    setEditing(null);
    setScope("one");
    setSessionId(sessions[0]?.id || "");
    setClassId(classes[0]?.id || "");
    setOpen(true);
  }, [classes, initialOpen, sessions]);

  function openEdit(struct: any) {
    setEditing(struct);
    setScope("one");
    setSessionId(struct.academic_year_id);
    setClassId(struct.class_id);
    setTuition(String(struct.tuition_fee ?? ""));
    setAdmission(String(struct.admission_fee ?? ""));
    setExam(String(struct.examination_fee ?? ""));
    setLibrary(String(struct.library_fee ?? ""));
    setLab(String(struct.laboratory_fee ?? ""));
    setTransport(String(struct.transport_fee ?? ""));
    setMisc(String(struct.miscellaneous_charges ?? ""));
    setError(null);
    setOpen(true);
  }

  function appendMoney(formData: FormData, key: string, value: string) {
    formData.append(key, value.trim() === "" ? "0" : value);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("academic_year_id", sessionId);
    formData.append("class_id", classId);
    formData.append("tuition_fee", tuition.trim());
    appendMoney(formData, "admission_fee", admission);
    appendMoney(formData, "examination_fee", exam);
    appendMoney(formData, "library_fee", library);
    appendMoney(formData, "laboratory_fee", lab);
    appendMoney(formData, "transport_fee", transport);
    appendMoney(formData, "miscellaneous_charges", misc);

    if (!editing && scope === "all") {
      classes.forEach((cls) => formData.append("class_ids", cls.id));
    }

    startTransition(async () => {
      try {
        if (editing) await updateFeeStructureAction(editing.id, formData);
        else if (scope === "all") await createFeeStructuresForClassesAction(formData);
        else await createFeeStructureAction(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save fee structure.");
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this fee structure? Student fee accounts mapped to it may be affected.")) return;
    startTransition(async () => {
      try {
        await deleteFeeStructureAction(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete fee structure.");
      }
    });
  }

  function renderActions(struct: Props["structures"][number]) {
    return (
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => openEdit(struct)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-muted hover:bg-surface-low hover:text-primary" aria-label="Edit fee structure">
          <Edit2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => remove(struct.id)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Delete fee structure">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline/60 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Current Fee Structures</h2>
            <p className="mt-1 text-sm text-muted">{structures.length} structure{structures.length === 1 ? "" : "s"} configured.</p>
          </div>
          {canManage ? (
            <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:brightness-105">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Fee Structure
            </button>
          ) : null}
        </div>

        {!structures.length ? (
          <div className="p-6">
            <EmptyState title="No fee structures" description="Add the first fee structure to start mapping class billing." />
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 lg:hidden">
              {structures.map((struct) => (
                <article key={struct.id} className="min-w-0 rounded-xl border border-outline/60 bg-white p-4">
                  <h3 className="max-w-full truncate rounded-lg bg-primary-soft px-3 py-2 text-sm font-bold text-primary" title={formatClassDisplayName(struct.classes?.grade_name, struct.classes?.name, struct.classes?.section_name)}>
                    {formatClassDisplayName(struct.classes?.grade_name, struct.classes?.name, struct.classes?.section_name)}
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {[
                      ["Session", struct.academic_years?.name || "—"],
                      ["Tuition", formatPKR(Number(struct.tuition_fee || 0))],
                      ["Admission", formatPKR(Number(struct.admission_fee || 0))],
                      ["Exam", formatPKR(Number(struct.examination_fee || 0))],
                      ["Other", formatPKR(otherFeeTotal(struct))],
                      ["Total", formatPKR(feeStructureTotal(struct))],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-lg bg-surface-low p-2">
                        <dt className="text-xs text-muted">{label}</dt>
                        <dd className="mt-1 break-words font-semibold tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {canManage ? <div className="mt-4 border-t border-outline/60 pt-2">{renderActions(struct)}</div> : null}
                </article>
              ))}
            </div>
            <div className="hidden max-w-full overflow-x-auto lg:block" data-responsive-table="desktop" role="region" aria-label="Current fee structures" tabIndex={0}>
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Tuition</th>
                    <th className="px-4 py-3">Admission</th>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Other</th>
                    <th className="px-4 py-3">Total</th>
                    {canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {structures.map((struct) => (
                    <tr key={struct.id} className="border-t border-outline/60">
                      <td className="px-4 py-3 font-semibold text-primary">{struct.academic_years?.name}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{formatClassDisplayName(struct.classes?.grade_name, struct.classes?.name, struct.classes?.section_name)}</td>
                      <td className="px-4 py-3">{formatPKR(Number(struct.tuition_fee || 0))}</td>
                      <td className="px-4 py-3">{formatPKR(Number(struct.admission_fee || 0))}</td>
                      <td className="px-4 py-3">{formatPKR(Number(struct.examination_fee || 0))}</td>
                      <td className="px-4 py-3">{formatPKR(otherFeeTotal(struct))}</td>
                      <td className="px-4 py-3 font-bold text-ink">{formatPKR(feeStructureTotal(struct))}</td>
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          {renderActions(struct)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {mounted && open ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fee-structure-title" className="w-full max-w-xl max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="sticky top-0 shrink-0 bg-white dark:bg-slate-900 border-b p-4 px-6 z-10 flex items-center justify-between gap-3">
              <h3 id="fee-structure-title" className="text-lg font-bold text-ink">{editing ? "Edit Fee Structure" : "Add Fee Structure"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2.5 text-muted hover:bg-surface-low" aria-label="Close fee structure form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="overflow-y-auto overscroll-contain p-6 space-y-4 min-h-0 flex-1">
                {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
                {!editing ? (
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-low p-1">
                    <button type="button" onClick={() => setScope("one")} className={`min-h-11 rounded-md px-3 py-2.5 text-sm font-semibold ${scope === "one" ? "bg-white text-primary shadow-sm" : "text-muted"}`}>
                      One class
                    </button>
                    <button type="button" onClick={() => setScope("all")} className={`min-h-11 rounded-md px-3 py-2.5 text-sm font-semibold ${scope === "all" ? "bg-white text-primary shadow-sm" : "text-muted"}`}>
                      All classes
                    </button>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Academic Session" required>
                    <Select value={sessionId} onChange={(event) => setSessionId(event.target.value)} disabled={!!editing}>
                      {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Class" required>
                    <Select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!!editing || scope === "all"}>
                      {classes.map((cls) => <option key={cls.id} value={cls.id}>{formatClassDisplayName(cls.grade_name, cls.name, cls.section_name)}</option>)}
                    </Select>
                  </Field>
                  <Field label="Tuition Fee" required><Input type="number" min="0" step="0.01" value={tuition} onChange={(event) => setTuition(event.target.value)} required /></Field>
                  <Field label="Admission Fee"><Input type="number" min="0" step="0.01" value={admission} onChange={(event) => setAdmission(event.target.value)} /></Field>
                  <Field label="Examination Fee"><Input type="number" min="0" step="0.01" value={exam} onChange={(event) => setExam(event.target.value)} /></Field>
                  <Field label="Library Fee"><Input type="number" min="0" step="0.01" value={library} onChange={(event) => setLibrary(event.target.value)} /></Field>
                  <Field label="Laboratory Fee"><Input type="number" min="0" step="0.01" value={lab} onChange={(event) => setLab(event.target.value)} /></Field>
                  <Field label="Transport Fee"><Input type="number" min="0" step="0.01" value={transport} onChange={(event) => setTransport(event.target.value)} /></Field>
                  <Field label="Miscellaneous Charges">
                    <Input type="number" min="0" step="0.01" value={misc} onChange={(event) => setMisc(event.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low p-3">
                  <span className="text-sm font-semibold text-muted">Total</span>
                  <span className="break-words font-display text-lg font-bold text-ink">{formatPKR(total)}</span>
                </div>
              </div>
              <div className="sticky bottom-0 shrink-0 bg-slate-50 dark:bg-slate-800 p-4 px-6 border-t flex flex-wrap justify-end gap-3 z-10">
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg bg-surface-low px-4 py-2.5 text-sm font-semibold text-muted">
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:bg-outline">
                  {pending ? "Saving..." : editing ? "Save Structure" : scope === "all" ? "Save for All Classes" : "Save Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}

function otherFeeTotal(struct: any) {
  return (
    Number(struct.library_fee || 0) +
    Number(struct.laboratory_fee || 0) +
    Number(struct.transport_fee || 0) +
    Number(struct.miscellaneous_charges || 0)
  );
}

function feeStructureTotal(struct: any) {
  return (
    Number(struct.tuition_fee || 0) +
    Number(struct.admission_fee || 0) +
    Number(struct.examination_fee || 0) +
    otherFeeTotal(struct)
  );
}
