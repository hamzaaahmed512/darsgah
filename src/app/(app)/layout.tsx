import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getSchoolProfile } from "@/lib/services/settings";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  // The optimized session RPC includes branding. During a rolling deployment,
  // fall back to the legacy settings query until the migration is installed.
  const legacyProfile = user.schoolLogoUrl === undefined || user.schoolFaviconUrl === undefined || user.schoolShortName === undefined
    ? await getSchoolProfile(user)
    : null;
  const settings = legacyProfile?.settings ?? {};

  return (
    <AppShell
      user={user}
      branding={{
        logoUrl: user.schoolLogoUrl ?? settings.schoolLogoUrl ?? null,
        faviconUrl: user.schoolFaviconUrl ?? settings.schoolFaviconUrl ?? null,
        shortName: user.schoolShortName ?? settings.schoolShortName ?? null,
        fullName: user.schoolFullName ?? legacyProfile?.school?.name ?? user.schoolName
      }}
    >
      {children}
    </AppShell>
  );
}
