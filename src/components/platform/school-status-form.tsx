"use client";

import { useActionState } from "react";
import { changeSchoolStatusAction } from "@/app/(platform)/platform/actions";

const initialState = { ok: false, error: "", errors: {} as Record<string, string[]> };

export function SchoolStatusForm({
  schoolId,
  platformStatus,
  suspensionReason
}: {
  schoolId: string;
  platformStatus: string;
  suspensionReason: string | null;
}) {
  const [state, action, pending] = useActionState(changeSchoolStatusAction, initialState);

  return (
    <>
      {platformStatus === "suspended" && suspensionReason ? (
        <div className="mt-5 rounded-xl bg-warning-soft p-4 text-xs leading-5 text-amber-800">
          <strong>Current reason:</strong> {suspensionReason}
        </div>
      ) : null}
      
      <form action={action} className="mt-6 grid gap-3">
        {state.error && <div className="rounded-xl bg-danger-soft p-4 text-sm font-bold text-danger">{state.error}</div>}
        
        <input type="hidden" name="schoolId" value={schoolId} />
        
        <label className="grid gap-2 text-xs font-bold text-ink">
          Reason
          <textarea 
            name="reason" 
            rows={3} 
            placeholder="Required when suspending" 
            className="platform-input h-auto resize-none py-3" 
          />
          {state.errors?.reason && <span className="text-danger">{state.errors.reason[0]}</span>}
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            name="status" 
            value={platformStatus === "suspended" ? "active" : "suspended"} 
            disabled={pending}
            className={`rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-50 ${platformStatus === "suspended" ? "bg-success text-white" : "bg-warning-soft text-amber-800"}`}
          >
            {platformStatus === "suspended" ? "Reactivate school" : "Suspend school"}
          </button>
          <button 
            name="status" 
            value="archived" 
            disabled={pending}
            className="rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger disabled:opacity-50"
          >
            Archive school
          </button>
        </div>
      </form>
    </>
  );
}
