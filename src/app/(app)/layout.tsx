import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/lib/auth/session";
import { getSchoolProfile } from "@/lib/services/settings";
import { getNotificationSummary } from "@/lib/services/notifications";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const legacyProfile = user.schoolLogoUrl === undefined || user.schoolFaviconUrl === undefined || user.schoolShortName === undefined
    ? await getSchoolProfile(user)
    : null;
  const settings = legacyProfile?.settings ?? {};
  const notificationSummary = await getNotificationSummary(user).catch((error) => {
    console.error("Notification summary failed:", error);
    return { notifications: [], sidebarBadges: { attendance: 0, leave: 0 } };
  });

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
          sidebarBadges={notificationSummary.sidebarBadges}
          initialWorkflowNotifications={notificationSummary.notifications}
        >
          {children}
        </AppShell>
      </OnboardingGate>
    </ToastProvider>
  );
}
