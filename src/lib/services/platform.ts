import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformSchoolStatus = "trial" | "active" | "suspended" | "archived";
export type BillingStatus = "trialing" | "active" | "past_due" | "cancelled";
export type SubscriptionPlan = "school" | "network" | "custom";

export type PlatformSchool = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  platform_status: PlatformSchoolStatus;
  subscription_plan: SubscriptionPlan;
  billing_status: BillingStatus;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  student_count: number;
};

const schoolColumns = "id,name,slug,timezone,platform_status,subscription_plan,billing_status,subscription_started_at,subscription_ends_at,contact_name,contact_email,suspended_at,suspension_reason,archived_at,created_at,updated_at";

async function withSchoolCounts(school: Omit<PlatformSchool, "member_count" | "student_count">): Promise<PlatformSchool> {
  const admin = createAdminClient();
  const [members, students] = await Promise.all([
    admin.from("school_members").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "active"),
    admin.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "active")
  ]);
  return { ...school, member_count: members.count ?? 0, student_count: students.count ?? 0 } as PlatformSchool;
}

export async function getPlatformSchools(): Promise<PlatformSchool[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("schools").select(schoolColumns).order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load schools: ${error.message}`);

  return Promise.all((data ?? []).map((school) => withSchoolCounts(school as Omit<PlatformSchool, "member_count" | "student_count">)));
}

export async function getPlatformSchool(id: string) {
  const admin = createAdminClient();
  const [{ data, error }, { data: audit }] = await Promise.all([
    admin.from("schools").select(schoolColumns).eq("id", id).maybeSingle(),
    admin.from("platform_audit_logs").select("id,action,details,created_at,actor_user_id").eq("school_id", id).order("created_at", { ascending: false }).limit(20)
  ]);
  if (error) throw new Error(`Unable to load school: ${error.message}`);
  if (!data) throw new Error("School not found.");
  const school = await withSchoolCounts(data as Omit<PlatformSchool, "member_count" | "student_count">);
  return { school, audit: audit ?? [] };
}

export async function getPlatformMetrics() {
  const schools = await getPlatformSchools();
  return {
    schools,
    total: schools.filter((school) => school.platform_status !== "archived").length,
    active: schools.filter((school) => school.platform_status === "active").length,
    trials: schools.filter((school) => school.platform_status === "trial").length,
    attention: schools.filter((school) => school.platform_status === "suspended" || school.billing_status === "past_due").length,
    students: schools.reduce((total, school) => total + school.student_count, 0)
  };
}

export async function recordPlatformAudit(actorUserId: string, schoolId: string, action: string, details: Record<string, unknown> = {}) {
  const { error } = await createAdminClient().from("platform_audit_logs").insert({ actor_user_id: actorUserId, school_id: schoolId, action, details });
  if (error) throw new Error(`Unable to record audit event: ${error.message}`);
}
