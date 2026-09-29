"use client";

import { CheckCircle2, Undo2 } from "lucide-react";
import { useState } from "react";
import { reviewExamApprovalAction } from "@/app/(app)/results/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-field";

export function ApprovalActions({ approvalId, showTooltips = false }: { approvalId: string; showTooltips?: boolean }) {
  const [returnFormOpen, setReturnFormOpen] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" className="h-9 w-9 rounded-xl px-0 text-warning hover:bg-warning-soft" onClick={() => setReturnFormOpen((open) => !open)} aria-label="Return to teacher" title={showTooltips ? "Return to teacher" : undefined}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <form action={reviewExamApprovalAction.bind(null, approvalId)}>
          <Button type="submit" name="decision" value="approved" size="sm" className="h-9 w-9 rounded-xl bg-success px-0 text-white hover:bg-success/90" aria-label="Approve result" title={showTooltips ? "Approve result" : undefined}>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
      {returnFormOpen ? (
        <form action={reviewExamApprovalAction.bind(null, approvalId)} className="grid gap-2">
          <Textarea name="principal_comment" placeholder="Correction instructions (optional)" rows={2} className="min-w-[190px] resize-y" autoFocus />
          <div className="flex justify-end">
            <Button type="submit" name="decision" value="returned" variant="secondary" size="sm" className="h-9 w-9 rounded-xl px-0 text-warning hover:bg-warning-soft" aria-label="Confirm return to teacher" title={showTooltips ? "Confirm return to teacher" : undefined}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
