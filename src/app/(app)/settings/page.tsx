import { requireUser } from "@/lib/auth/session";
import { 
  getSchoolSettings,
  getAcademicYears,
  getPrincipalTeachingSettings
} from "@/lib/services/settings";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser("settings:manage");
  const [schoolSettings, academicYears, principalTeachingSettings] = await Promise.all([
    getSchoolSettings(user),
    getAcademicYears(user),
    user.role === "principal" ? getPrincipalTeachingSettings(user) : Promise.resolve({ classes: [], assignedClassId: null })
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Configure notification preferences, teaching assignments, result cards, and academic sessions."
      />

      <SettingsTabs
        user={user}
        schoolSettings={schoolSettings}
        academicYears={academicYears}
        principalTeachingSettings={principalTeachingSettings}
        initialTab={params.tab}
      />
    </>
  );
}
