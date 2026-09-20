import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

function logFailure(correlationId: string, cause?: unknown) {
  const name = cause instanceof Error ? cause.name : "UnknownError";
  const code = cause && typeof cause === "object" && "code" in cause
    && typeof cause.code === "string" ? cause.code : "unclassified";
  console.error(`Request ${correlationId} failed: ${name} (${code}).`);
}

export function publicActionError(cause?: unknown) {
  const correlationId = randomUUID();
  logFailure(correlationId, cause);
  return `Request could not be completed. Reference: ${correlationId}`;
}

export function publicApiError(status: number, cause?: unknown) {
  const correlationId = randomUUID();
  if (status >= 500) logFailure(correlationId, cause);
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized." : "Request could not be completed.", correlationId },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
