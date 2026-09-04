"use client";

import { CheckCircle2, Undo2 } from "lucide-react";
import { useState } from "react";
import { reviewExamApprovalAction } from "@/app/(app)/results/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-field";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const [returnFormOpen, setReturnFormOpen] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" className="text-warning hover:bg-warning-soft" onClick={() => setReturnFormOpen((open) => !open)}>
          <Undo2 className="h-4 w-4" /> Return to teacher
        </Button>
        <form action={reviewExamApprovalAction.bind(null, approvalId)}>
          <Button type="submit" name="decision" value="approved" size="sm" className="bg-success text-white hover:bg-success/90">
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
        </form>
      </div>
      {returnFormOpen ? (
        <form action={reviewExamApprovalAction.bind(null, approvalId)} className="grid gap-2">
          <Textarea name="principal_comment" placeholder="Correction instructions" rows={2} required className="min-w-[190px] resize-y" autoFocus />
          <div className="flex justify-end">
            <Button type="submit" name="decision" value="returned" variant="secondary" size="sm" className="text-warning hover:bg-warning-soft">
              <Undo2 className="h-4 w-4" /> Confirm return
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
