"use client";

import { Archive, X, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { checkSubjectDeletionAction, deleteSubjectAction } from "@/app/(app)/subjects/actions";

export function SubjectDeleteModal({ subjectId, subjectName }: { subjectId: string; subjectName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState<"check" | "confirm" | "warning">("check");
  const [combinations, setCombinations] = useState<string[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);

  function close() {
    if (pending) return;
    setOpen(false);
    setTimeout(() => {
      setStep("check");
      setError(null);
      setCombinations([]);
      setAssessmentCount(0);
    }, 200);
  }

  function handleCheck() {
    setOpen(true);
    setStep("check");
    setError(null);
    
    startTransition(async () => {
      try {
        const impact = await checkSubjectDeletionAction(subjectId);
        setCombinations(impact.combinationNames);
        setAssessmentCount(impact.assessmentCount);
        if (impact.combinationNames.length > 0 || impact.assessmentCount > 0) {
          setStep("warning");
        } else {
          setStep("confirm");
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to check subject combinations.");
        setStep("confirm"); // Fallback to confirm, though it will likely fail later too
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteSubjectAction(subjectId);
        if (result.error) {
          setError(result.error);
          return;
        }
        alert(result.archived ? "Subject archived. Historical assessments and results were preserved." : "Subject archived successfully.");
        close();
      } catch (err: any) {
        setError(err?.message ?? "Failed to delete subject.");
      }
    });
  }

  return (
    <>
      <button 
        type="button" 
        onClick={handleCheck}
        className="rounded p-1.5 text-muted hover:bg-danger-soft hover:text-danger transition-colors"
        aria-label={`Archive ${subjectName}`}
        title={`Archive ${subjectName}`}
      >
        <Archive className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div className="flex items-center gap-3">
                {step === "warning" ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                ) : null}
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">Archive subject</h2>
                  <p className="mt-1 text-sm text-muted">Remove {subjectName} from active use.</p>
                </div>
              </div>
              <button type="button" onClick={close} disabled={pending} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {error ? <div className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
              
              {step === "check" ? (
                <div className="py-8 text-center text-muted">
                  <p>Checking dependencies...</p>
                </div>
              ) : step === "warning" ? (
                <div className="grid gap-4">
                  <p className="text-ink">
                    <strong>Before archiving:</strong> {subjectName} will no longer be available for new classes, combinations, or assessments.
                  </p>
                  {combinations.length ? <>
                    <p className="text-sm text-ink">It will be removed from these active combinations:</p>
                    <ul className="list-disc pl-5 text-sm text-ink space-y-1">
                      {combinations.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </> : null}
                  {assessmentCount > 0 ? (
                    <p className="rounded-xl bg-warning-soft p-3 text-sm text-ink">
                      {assessmentCount} historical assessment{assessmentCount === 1 ? "" : "s"} and all related marks will be preserved.
                    </p>
                  ) : null}
                  <p className="text-sm text-muted">
                    This keeps past reports accurate while cleaning the active subject catalog.
                  </p>
                </div>
              ) : (
                <p className="text-ink">Are you sure you want to archive {subjectName}?</p>
              )}

              {step !== "check" && (
                <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={handleDelete} 
                    disabled={pending}
                  >
                    {pending ? "Archiving..." : "Archive subject"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
