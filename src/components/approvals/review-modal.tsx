"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-field";
import type { ApprovalRequest } from "@/types/database";
import { reviewStudentRequestAction } from "@/app/(app)/students/actions";

export function ReviewModal({ request, onClose }: { request: ApprovalRequest; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (decision) {
      formData.set("decision", decision);
    }
    
    startTransition(async () => {
      const result = await reviewStudentRequestAction(request.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Review Request</h2>
          <Badge tone={request.request_type === "admission" ? "blue" : "yellow"}>
            {request.request_type}
          </Badge>
        </div>

        <div className="mb-6 space-y-4 rounded-lg bg-surface-low p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Student</p>
            <p className="font-semibold text-ink">{request.student_first_name} {request.student_last_name}</p>
            <p className="text-sm text-muted">{request.student_admission_number}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Submitted By</p>
            <p className="text-ink">{request.submitted_by_name}</p>
            <p className="text-sm text-muted">{new Date(request.submitted_at).toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-ink">Denial Reason (if denying)</label>
            <Textarea name="denial_reason" placeholder="Please provide a reason if you are denying this request..." />
            {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              name="decision" 
              value="denied" 
              variant="secondary" 
              className="text-danger hover:bg-danger-soft"
              disabled={pending}
            >
              Deny
            </Button>
            <Button 
              type="submit" 
              name="decision" 
              value="approved"
              disabled={pending}
              className="bg-success text-white hover:bg-success/90"
            >
              {pending ? "Processing..." : "Approve"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
