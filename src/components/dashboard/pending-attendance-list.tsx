"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, Mail, Users, UserRound } from "lucide-react";
import { sendAttendanceReminderAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { PendingAttendanceClass } from "@/types/database";
import { formatClassDisplayName } from "@/lib/utils";

export function PendingAttendanceList({ classes, todayLabel }: { classes: PendingAttendanceClass[]; todayLabel: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [sentClassIds, setSentClassIds] = useState<Set<string>>(
    () => new Set(classes.filter((item) => item.reminder_sent_at).map((item) => item.id))
  );
  const [statusByClassId, setStatusByClassId] = useState<Record<string, { type: "success" | "error"; text: string }>>({});

  if (!classes.length) {
    return (
      <EmptyState
        title="All attendance completed for today!"
        description={`Every class in the active academic year has submitted attendance for ${todayLabel}.`}
        className="min-h-40 bg-transparent p-4"
      />
    );
  }

  function sendReminder(classId: string) {
    setActiveClassId(classId);
    setStatusByClassId((current) => {
      const next = { ...current };
      delete next[classId];
      return next;
    });
    startTransition(async () => {
      const result = await sendAttendanceReminderAction(classId);
      setActiveClassId(null);
      if (result.error) {
        if (result.alreadySent) {
          setSentClassIds((current) => new Set(current).add(classId));
          return;
        }
        setStatusByClassId((current) => ({ ...current, [classId]: { type: "error", text: result.error } }));
        pushToast(result.error, "error");
        setTimeout(() => {
          setStatusByClassId((current) => {
            const next = { ...current };
            delete next[classId];
            return next;
          });
        }, 4000);
        return;
      }
      setSentClassIds((current) => new Set(current).add(classId));
      pushToast(`Reminder sent to ${result.teacherName}.`, "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {classes.map((item) => {
        const contact = item.head_teacher_email ?? item.head_teacher_phone;
        const isSending = pending && activeClassId === item.id;
        const alreadySent = Boolean(item.reminder_sent_at) || sentClassIds.has(item.id);
        const rowStatus = statusByClassId[item.id];

        return (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-[20px] border border-outline/60 bg-white p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4"
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${item.head_teacher_id ? "border-primary/20 bg-blue-50 text-primary" : "border-warning/20 bg-amber-50 text-warning"}`}>
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-[1.25rem] font-bold leading-tight text-ink">{formatClassDisplayName(item.grade_name, item.name, item.section_name)}</h4>
                    {item.grade_name && item.room ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                        · {item.room}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-sm text-muted">
                    <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.head_teacher_name ?? "No head teacher assigned"}</p>
                      {contact ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {contact}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs">No contact on file</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!item.head_teacher_id || isSending || alreadySent}
                onClick={() => sendReminder(item.id)}
                className={`min-h-10 rounded-2xl px-4 text-sm ${alreadySent ? "bg-surface-high text-muted ring-outline" : ""}`}
              >
                {isSending ? (
                  "Sending..."
                ) : alreadySent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Reminder Sent
                  </>
                ) : (
                  <>
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                    Send Reminder
                  </>
                )}
              </Button>
              {alreadySent ? (
                <p className="text-[11px] font-semibold text-muted">Already send</p>
              ) : rowStatus ? (
                <p className={`text-[11px] font-semibold ${rowStatus.type === "success" ? "text-success" : "text-danger"}`}>
                  {rowStatus.text}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PendingAttendanceSuccessState({ todayLabel }: { todayLabel: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-[20px] border border-success/15 bg-success-soft/40 p-6 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-success-soft text-success">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-bold text-ink">All attendance completed for today!</h3>
      <p className="mt-2 max-w-md text-sm text-muted">Every class has submitted attendance for {todayLabel}.</p>
    </div>
  );
}
