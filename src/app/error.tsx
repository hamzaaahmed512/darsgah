"use client";

import { useState } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [fallbackId] = useState(() => crypto.randomUUID());
  return <main className="mx-auto max-w-lg px-6 py-20">
    <h1 className="text-2xl font-semibold">Something went wrong</h1>
    <p className="mt-3">Your request could not be completed. Please try again.</p>
    <p className="mt-2 text-sm">Reference: {error.digest || fallbackId}</p>
    <button type="button" onClick={reset} className="mt-5 rounded-lg border px-4 py-2">Try again</button>
  </main>;
}
