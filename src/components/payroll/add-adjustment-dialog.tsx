"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { createAdjustmentAction } from "@/app/(app)/finance/payroll/actions";
import type { AdjustmentType } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  month: string;
  teachers: Array<{ id: string; name: string; email?: string; role?: string }>;
}

export function AddAdjustmentDialog({ month, teachers }: Props) {
  const [open, setOpen] = useState(false);
  const [teacherSelectOpen, setTeacherSelectOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    teacher_id: "",
    amount: "",
    type: "bonus" as AdjustmentType,
    reason: "",
    effective_date: `${month}-01`
  });

  const selectedTeacher = teachers.find((teacher) => teacher.id === form.teacher_id) ?? null;
  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLocaleLowerCase();
    if (!query) return teachers;
    return teachers.filter((teacher) =>
      [teacher.name, teacher.email, teacher.role]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query))
    );
  }, [teacherSearch, teachers]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function selectTeacher(teacherId: string) {
    handleChange("teacher_id", teacherId);
    setTeacherSelectOpen(false);
    setTeacherSearch("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.teacher_id || !form.amount || !form.reason) {
      setError("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      const res = await createAdjustmentAction({
        teacherId: form.teacher_id,
        amount: Number(form.amount),
        type: form.type,
        reason: form.reason,
        effective_date: form.effective_date
      });
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:brightness-105"
      >
        Add Adjustment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_32px_80px_rgba(27,28,29,0.18)]">
            <h2 className="mb-4 font-display text-xl font-bold text-ink">Add Salary Adjustment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Select Teacher<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTeacherSelectOpen((value) => !value)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-outline bg-white px-4 py-2.5 text-left text-sm font-medium text-ink shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
                    aria-haspopup="listbox"
                    aria-expanded={teacherSelectOpen}
                  >
                    <span className={cn("min-w-0 flex-1 truncate", !selectedTeacher && "text-muted/70")}>
                      {selectedTeacher ? selectedTeacher.name : "Choose a teacher"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>

                  {teacherSelectOpen ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-outline bg-white shadow-lift">
                      <div className="flex items-center gap-2 border-b border-outline/60 px-3 py-2">
                        <Search className="h-4 w-4 text-muted" aria-hidden="true" />
                        <input
                          value={teacherSearch}
                          onChange={(event) => setTeacherSearch(event.target.value)}
                          placeholder="Search teacher"
                          className="min-h-9 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted/60"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1" role="listbox">
                        {!filteredTeachers.length ? (
                          <p className="px-3 py-3 text-sm font-medium text-muted">No teachers found.</p>
                        ) : (
                          filteredTeachers.map((teacher) => (
                            <button
                              key={teacher.id}
                              type="button"
                              onClick={() => selectTeacher(teacher.id)}
                              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-surface-low"
                              role="option"
                              aria-selected={teacher.id === form.teacher_id}
                            >
                              <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", teacher.id === form.teacher_id ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">{teacher.name}</span>
                                <span className="block truncate text-xs font-medium text-muted">
                                  {[teacher.email, teacher.role?.replace("_", " ")].filter(Boolean).join(" • ")}
                                </span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="bonus">Bonus</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">
                    Amount (PKR)<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Reason<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  value={form.reason}
                  required
                  onChange={(e) => handleChange("reason", e.target.value)}
                  placeholder="e.g. Performance bonus, Late attendance deduction"
                  className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Effective Date</label>
                <input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => handleChange("effective_date", e.target.value)}
                  className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setTeacherSelectOpen(false);
                  }}
                  className="rounded-lg border border-outline/60 px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !form.teacher_id}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
