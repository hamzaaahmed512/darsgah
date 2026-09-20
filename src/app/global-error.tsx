"use client";

import { useState } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [fallbackId] = useState(() => crypto.randomUUID());
  return <html><body><main style={{ maxWidth: 480, margin: "5rem auto", padding: "1rem" }}>
    <h1>Something went wrong</h1>
    <p>Your request could not be completed. Please try again.</p>
    <p>Reference: {error.digest || fallbackId}</p>
    <button type="button" onClick={reset}>Try again</button>
  </main></body></html>;
}
