"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPlatformAudit } from "@/lib/services/platform";

const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.preprocess(
    (value) => String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    z.string().min(1, "Enter a URL slug.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Enter a valid URL slug.")
  ),
  timezone: z.string().trim().min(1),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  principalName: z.string().trim().min(2).max(120),
  principalEmail: z.string().trim().email(),
  temporaryPassword: z.string().min(12, "Temporary password must contain at least 12 characters."),
  platformStatus: z.enum(["trial", "active"]),
  subscriptionPlan: z.enum(["school", "network", "custom"]),
  billingStatus: z.enum(["trialing", "active"]),
  subscriptionEndsAt: z.string().optional()
});

export async function createSchoolAction(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const values = createSchoolSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const { data, error } = await admin.from("schools").insert({
    name: values.name,
    slug: values.slug,
    timezone: values.timezone,
    contact_name: values.contactName || null,
    contact_email: values.contactEmail || null,
    platform_status: values.platformStatus,
    subscription_plan: values.subscriptionPlan,
    billing_status: values.billingStatus,
    subscription_started_at: new Date().toISOString(),
    subscription_ends_at: values.subscriptionEndsAt ? new Date(`${values.subscriptionEndsAt}T23:59:59Z`).toISOString() : null
  }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "That school slug is already in use." : error.message);

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: values.principalEmail,
    password: values.temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: values.principalName }
  });
  if (authError || !authData.user) {
    await admin.from("schools").delete().eq("id", data.id);
    throw new Error(authError?.message ?? "Unable to create the principal account.");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    full_name: values.principalName,
    email: values.principalEmail,
    must_change_password: true
  });
  const { error: memberError } = profileError ? { error: null } : await admin.from("school_members").insert({
    school_id: data.id,
    user_id: authData.user.id,
    role: "principal",
    status: "active",
    job_title: "Principal"
  });
  if (profileError || memberError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("schools").delete().eq("id", data.id);
    throw new Error(profileError?.message ?? memberError?.message ?? "Unable to provision the principal account.");
  }
  await recordPlatformAudit(actor.id, data.id, "school.created", { name: values.name, plan: values.subscriptionPlan });
  revalidatePath("/platform", "layout");
  redirect(`/platform/schools/${data.id}`);
}

export async function changeSchoolStatusAction(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const schoolId = z.string().uuid().parse(formData.get("schoolId"));
  const status = z.enum(["active", "suspended", "archived"]).parse(formData.get("status"));
  const reason = z.string().trim().max(500).parse(formData.get("reason") ?? "");
  if (status === "suspended" && !reason) throw new Error("A suspension reason is required.");
  const update = {
    platform_status: status,
    suspended_at: status === "suspended" ? new Date().toISOString() : null,
    suspension_reason: status === "suspended" ? reason : null,
    archived_at: status === "archived" ? new Date().toISOString() : null
  };
  const { error } = await createAdminClient().from("schools").update(update).eq("id", schoolId);
  if (error) throw new Error(error.message);
  await recordPlatformAudit(actor.id, schoolId, `school.${status}`, reason ? { reason } : {});
  revalidatePath("/platform");
  revalidatePath(`/platform/schools/${schoolId}`);
}

export async function updateSubscriptionAction(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const values = z.object({
    schoolId: z.string().uuid(),
    subscriptionPlan: z.enum(["school", "network", "custom"]),
    billingStatus: z.enum(["trialing", "active", "past_due", "cancelled"]),
    subscriptionEndsAt: z.string().optional()
  }).parse(Object.fromEntries(formData));
  const { error } = await createAdminClient().from("schools").update({
    subscription_plan: values.subscriptionPlan,
    billing_status: values.billingStatus,
    subscription_ends_at: values.subscriptionEndsAt ? new Date(`${values.subscriptionEndsAt}T23:59:59Z`).toISOString() : null
  }).eq("id", values.schoolId);
  if (error) throw new Error(error.message);
  await recordPlatformAudit(actor.id, values.schoolId, "subscription.updated", { plan: values.subscriptionPlan, billingStatus: values.billingStatus, endsAt: values.subscriptionEndsAt || null });
  revalidatePath("/platform");
  revalidatePath(`/platform/schools/${values.schoolId}`);
  revalidatePath("/platform/subscriptions");
}
