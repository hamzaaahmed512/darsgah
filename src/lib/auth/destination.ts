const AUTH_ROUTES = ["/sign-in", "/forgot-password", "/reset-password", "/change-password"];

export function resolveAuthDestination(
  requested: string | null | undefined,
  canAccessPlatform: boolean
) {
  const fallback = canAccessPlatform ? "/platform" : "/dashboard";
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
