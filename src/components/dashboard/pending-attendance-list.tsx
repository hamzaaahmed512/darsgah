"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, Mail, User } from "lucide-react";
import { sendAttendanceReminderAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { PendingAttendanceClass } from "@/types/database";

export function PendingAttendanceList({ classes, todayLabel }: { classes: PendingAttendanceClass[]; todayLabel: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  if (!classes.length) {
    return (
      <EmptyState
        title="All attendance completed for today!"
        description={`Every class in the active academic year has submitted attendance for ${todayLabel}.`}
        className="min-h-48 bg-transparent p-6"
      />
    );
  }

  function sendReminder(classId: string) {
    setActiveClassId(classId);
    startTransition(async () => {
      const result = await sendAttendanceReminderAction(classId);
      setActiveClassId(null);
      if (result.error) {
        pushToast(result.error, "error");
        return;
      }
      pushToast(`Reminder sent to ${result.teacherName}.`, "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {classes.map((item) => {
        const contact = item.head_teacher_email ?? item.head_teacher_phone;
        const isSending = pending && activeClassId === item.id;

        return (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-xl border border-outline/40 bg-surface-low p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-lg font-semibold text-ink">{item.name}</h4>
                {item.grade_name ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {item.grade_name}
                    {item.section_name ? ` · ${item.section_name}` : ""}
                    {item.room ? ` · ${item.room}` : ""}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm text-muted">
                <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink">{item.head_teacher_name ?? "No head teacher assigned"}</p>
                  {contact ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      {contact}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs">No contact on file</p>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              disabled={!item.head_teacher_id || isSending}
              onClick={() => sendReminder(item.id)}
            >
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  Send Reminder
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function PendingAttendanceSuccessState({ todayLabel }: { todayLabel: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-success-soft/40 p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold text-ink">All attendance completed for today!</h3>
      <p className="mt-2 max-w-md text-sm text-muted">Every class has submitted attendance for {todayLabel}.</p>
    </div>
  );
}
