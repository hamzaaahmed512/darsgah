import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { DeleteAccount } from "@/components/profile/delete-account";
import { requireUser } from "@/lib/auth/session";
import { getProfileDetails } from "@/lib/services/profile";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfileDetails(user);

  return (
    <>
      <PageHeader
        eyebrow="My account"
        title="Profile"
        description="Keep your school profile current so administrators can see the right contact, department, and role context."
      />
      <ProfileForm profile={profile} />
      <DeleteAccount />
    </>
  );
}
