"use client";

import { useEffect } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Platform error:", error);
  }, [error]);

  // Extract the most useful message
  let message = error.message || "An unexpected error occurred.";
  if (message.includes("ZodError")) {
    message = "Please check all required form fields and try again.";
  }

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
        <AlertCircle className="h-8 w-8 text-danger" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-ink">Action failed</h1>
      <p className="mb-8 max-w-md text-sm leading-6 text-muted">
        {message}
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-button transition-transform active:scale-95"
        >
          Try again
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-slate-50 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    </div>
  );
}
