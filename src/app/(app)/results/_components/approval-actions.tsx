import { CheckCircle2, XCircle } from "lucide-react";
import { reviewExamApprovalAction } from "@/app/(app)/results/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-field";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  return (
    <form action={reviewExamApprovalAction.bind(null, approvalId)} className="grid gap-2">
      <Textarea name="principal_comment" placeholder="Optional Principal comment" rows={2} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" name="decision" value="rejected" variant="secondary" size="sm" className="text-danger hover:bg-danger-soft">
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button type="submit" name="decision" value="approved" size="sm" className="bg-success text-white hover:bg-success/90">
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
      </div>
    </form>
  );
}
