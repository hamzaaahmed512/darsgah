import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/types/database";
import { profileFormSchema, type ProfileFormValues } from "@/lib/validation/profile";

type ProfileDetailsRow = {
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  personal_email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

type MemberDetailsRow = {
  department: string | null;
  job_title: string | null;
};

export type ProfileDetails = ProfileFormValues & {
  email: string | null;
  avatarUrl: string | null;
  role: AppUser["role"];
  schoolName: string;
};

export async function getProfileDetails(user: AppUser): Promise<ProfileDetails> {
  const supabase = await createClient();

  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,avatar_url,phone,personal_email,address,emergency_contact_name,emergency_contact_phone")
      .eq("id", user.id)
      .maybeSingle<ProfileDetailsRow>(),
    supabase
      .from("school_members")
      .select("department,job_title")
      .eq("school_id", user.schoolId)
      .eq("user_id", user.id)
      .maybeSingle<MemberDetailsRow>()
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (memberResult.error) throw new Error(memberResult.error.message);

  const profile = profileResult.data;
  const member = memberResult.data;

  return {
    fullName: profile?.full_name ?? user.fullName,
    email: profile?.email ?? user.email,
    avatarUrl: profile?.avatar_url ?? user.avatarUrl,
    phone: profile?.phone ?? null,
    personalEmail: profile?.personal_email ?? null,
    department: member?.department ?? user.department,
    jobTitle: member?.job_title ?? user.jobTitle,
    address: profile?.address ?? null,
    emergencyContactName: profile?.emergency_contact_name ?? null,
    emergencyContactPhone: profile?.emergency_contact_phone ?? null,
    role: user.role,
    schoolName: user.schoolName
  };
}

export async function updateProfileDetails(user: AppUser, values: ProfileFormValues) {
  const parsed = profileFormSchema.parse(values);
  const adminClient = createAdminClient();

  const profileUpdate: Record<string, unknown> = {
    full_name: parsed.fullName,
    phone: parsed.phone ?? null,
    personal_email: parsed.personalEmail ?? null,
    address: parsed.address,
    emergency_contact_name: parsed.emergencyContactName,
    emergency_contact_phone: parsed.emergencyContactPhone
  };

  const memberUpdate: Record<string, unknown> = {};

  // Only principals can change department
  if (user.role === "principal") {
    memberUpdate.department = parsed.department;
  }

  // Job title is always read-only for users — only principals can update it
  if (user.role === "principal") {
    memberUpdate.job_title = parsed.jobTitle;
  }

  const updates = [
    adminClient.from("profiles").update(profileUpdate).eq("id", user.id)
  ];

  if (Object.keys(memberUpdate).length > 0) {
    updates.push(
      adminClient
        .from("school_members")
        .update(memberUpdate)
        .eq("school_id", user.schoolId)
        .eq("user_id", user.id)
    );
  }

  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw new Error(error.message);
  }
}
