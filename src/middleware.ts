import { NextResponse, type NextRequest } from "next/server";
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
  // Keep CSP on every HTML page, but refresh sessions only where needed.
  const root = request.nextUrl.pathname.split("/")[1];
  const sessionRoutes = new Set([
    "academics", "activity", "admin", "announcements", "approvals", "attendance",
    "classes", "dashboard", "exam-approvals", "finance", "help", "leave", "library",
    "marks", "onboarding", "operations", "profile", "queries", "reports", "results",
    "school-profile", "settings", "special-exams", "staff", "students", "subjects",
    "teachers", "transport", "unauthorized", "platform", "change-password", "reset-password", "api"
  ]);
  const response = sessionRoutes.has(root)
    ? await updateSession(request, forwardedHeaders)
    : NextResponse.next({ request: { headers: forwardedHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|css|js|map)$).*)"]
};
