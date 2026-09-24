import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  const websocket = origin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const policy = [
    "default-src 'self'",
    // Next's development runtime uses eval for source maps and Fast Refresh.
    // React PDF's Yoga layout engine needs WebAssembly compilation. This narrow
    // allowance preserves the nonce policy and the production ban on JS eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${origin} ${websocket}`,
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"
  ].join("; ");
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("Content-Security-Policy", policy);
  forwardedHeaders.set("x-nonce", nonce);
  forwardedHeaders.set("x-request-id", requestId);
  const response = await updateSession(request, forwardedHeaders);
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
