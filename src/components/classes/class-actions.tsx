"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X as XIcon } from "lucide-react";
import { deleteClassAction, unassignTeacherClassAction } from "@/app/(app)/classes/actions";

export function DeleteClassButton({ classId, className }: { classId: string; className: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 text-red-700 shadow-none hover:bg-red-100"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete class "${className}"? This will also remove all teacher assignments. Students must be withdrawn first.`)) return;
        startTransition(async () => {
          try {
            await deleteClassAction(classId);
          } catch (err: any) {
            alert(err.message || "Failed to delete class.");
          }
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function RemoveAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="ml-auto text-muted hover:text-danger transition-colors"
      title="Remove assignment"
      onClick={() => {
        if (!window.confirm("Remove this teacher assignment?")) return;
        startTransition(async () => {
          try {
            await unassignTeacherClassAction(assignmentId);
          } catch (err: any) {
            alert(err.message || "Failed to remove assignment.");
          }
        });
      }}
    >
      <XIcon className="h-3.5 w-3.5" />
    </button>
  );
}
