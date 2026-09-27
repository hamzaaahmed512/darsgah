import { DownloadActionProvider } from "@/components/reports/DownloadActionModal";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/lib/auth/session";
import { getSchoolProfile } from "@/lib/services/settings";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { ReportBrandingProvider } from "@/components/reports/report-branding";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const [legacyProfile, canAccessAcademicControl] = await Promise.all([
    user.schoolLogoUrl === undefined || user.schoolFaviconUrl === undefined || user.schoolShortName === undefined
      ? getSchoolProfile(user) : Promise.resolve(null),
    user.role === "principal"
      ? principalCanAccessAcademicControl(user).catch(() => {
          console.error("Principal Academic Control access check failed.");
          return false;
        })
      : Promise.resolve(false)
  ]);
  const settings = legacyProfile?.settings ?? {};

  return (
    <ToastProvider>
      <OnboardingGate userRole={user.role}>
        <AppShell
          user={user}
          branding={{
            logoUrl: user.schoolLogoUrl ?? settings.schoolLogoUrl ?? null,
            faviconUrl: user.schoolFaviconUrl ?? settings.schoolFaviconUrl ?? null,
            shortName: user.schoolShortName ?? settings.schoolShortName ?? null,
            fullName: user.schoolFullName ?? legacyProfile?.school?.name ?? user.schoolName
          }}
          principalCanAccessAcademicControl={canAccessAcademicControl}
        >
          <ReportBrandingProvider school={{ name: user.schoolFullName ?? legacyProfile?.school?.name ?? user.schoolName, logoUrl: user.schoolLogoUrl ?? settings.schoolLogoUrl ?? null }}>
            <DownloadActionProvider>{children}</DownloadActionProvider>
          </ReportBrandingProvider>
        </AppShell>
      </OnboardingGate>
    </ToastProvider>
  );
}

