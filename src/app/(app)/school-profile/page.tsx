import { PageHeader } from "@/components/layout/page-header";
import { SchoolProfileForm } from "@/components/school/school-profile-form";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getSchoolProfile } from "@/lib/services/settings";

export default async function SchoolProfilePage() {
  const user = await requireUser();
  const schoolProfile = await getSchoolProfile(user);
  const canManageSchoolProfile = hasPermission(user.role, "settings:manage", user.permissions);
  const settings = schoolProfile.settings ?? {};

  return (
    <>
      <PageHeader
        eyebrow="School"
        title="School Profile"
        description="Keep your school's shared details, branding, and contact information current."
      />

      <SchoolProfileForm
        canManage={canManageSchoolProfile}
        schoolName={schoolProfile.school?.name ?? user.schoolName}
        shortName={settings.schoolShortName ?? ""}
        schoolTimezone={schoolProfile.school?.timezone ?? "UTC"}
        email={settings.schoolEmail ?? ""}
        phone={settings.schoolPhone ?? ""}
        website={settings.schoolWebsite ?? ""}
        logoUrl={settings.schoolLogoUrl ?? ""}
        faviconUrl={canManageSchoolProfile ? settings.schoolFaviconUrl ?? "" : ""}
        brandVersion={String(settings.schoolBrandVersion ?? "")}
      />
    </>
  );
}
