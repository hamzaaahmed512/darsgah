import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/lib/auth/session";
import { getStaff } from "@/lib/services/staff";
import { getSchoolProfile } from "@/lib/services/settings";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const legacyProfile = user.schoolLogoUrl === undefined || user.schoolFaviconUrl === undefined || user.schoolShortName === undefined
    ? await getSchoolProfile(user)
    : null;
  const settings = legacyProfile?.settings ?? {};

  const teachers = user.role === "principal"
    ? (await getStaff(user))
        .filter((staffMember: any) => staffMember.role === "teacher" || staffMember.role === "head_teacher")
        .map((staffMember: any) => ({ user_id: staffMember.user_id, full_name: staffMember.full_name }))
    : [];

  return (
    <ToastProvider>
      <OnboardingGate userRole={user.role} teachers={teachers}>
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
      </OnboardingGate>
    </ToastProvider>
  );
}
