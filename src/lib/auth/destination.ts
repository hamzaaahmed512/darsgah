import type { UserRole } from "@/types/database";

const AUTH_ROUTES = ["/sign-in", "/forgot-password", "/reset-password", "/change-password"];

export function defaultDestinationForRole(role: UserRole | null | undefined) {
  if (role === "principal") return "/dashboard/principal";
  if (role === "administrator") return "/dashboard/admin";
  if (role === "student_staff") return "/dashboard/registrar";
  if (role === "teacher" || role === "head_teacher") return "/dashboard/teacher";
  if (role === "librarian") return "/library";
  return "/dashboard";
}

export function resolveAuthDestination(
  requested: string | null | undefined,
  canAccessPlatform: boolean,
  schoolDestination = "/dashboard"
) {
  const fallback = canAccessPlatform ? "/platform" : schoolDestination;
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return fallback;

  let pathname: string;
  try {
    pathname = new URL(requested, "https://darsgah.invalid").pathname;
  } catch {
    return fallback;
  }

  if (AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return fallback;
  if ((pathname === "/platform" || pathname.startsWith("/platform/")) && !canAccessPlatform) return fallback;
  return requested;
}
