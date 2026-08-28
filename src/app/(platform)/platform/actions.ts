"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPlatformAudit } from "@/lib/services/platform";
import { normalizeEmail, normalizeOptionalEmail } from "@/lib/email";

const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(120).transform((value) => value.toUpperCase()),
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
  contactEmail: z.preprocess(normalizeOptionalEmail, z.string().email().nullable()),
  principalName: z.string().trim().min(2).max(120),
  principalEmail: z.string().trim().toLowerCase().email().transform(normalizeEmail),
  temporaryPassword: z.string().min(12, "Temporary password must contain at least 12 characters."),
  platformStatus: z.enum(["trial", "active"]),
  subscriptionPlan: z.enum(["school", "network", "custom"]),
  billingStatus: z.enum(["trialing", "active"]),
  subscriptionEndsAt: z.string().optional()
});

export async function createSchoolAction(prevState: any, formData: FormData) {
  const actor = await requirePlatformAdmin();
  const values = createSchoolSchema.safeParse(Object.fromEntries(formData));
  
  if (!values.success) {
    return { ok: false, error: "Please correct the errors in the form.", errors: values.error.flatten().fieldErrors };
  }
  
  const admin = createAdminClient();
  const { data, error } = await admin.from("schools").insert({
    name: values.data.name,
    slug: values.data.slug,
    timezone: values.data.timezone,
    contact_name: values.data.contactName || null,
    contact_email: values.data.contactEmail || null,
    platform_status: values.data.platformStatus,
    subscription_plan: values.data.subscriptionPlan,
    billing_status: values.data.billingStatus,
    subscription_started_at: new Date().toISOString(),
    subscription_ends_at: values.data.subscriptionEndsAt ? new Date(`${values.data.subscriptionEndsAt}T23:59:59Z`).toISOString() : null
  }).select("id").single();
  
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That school slug is already in use.", errors: { slug: ["Slug already in use"] } };
    }
    return { ok: false, error: error.message, errors: {} };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: values.data.principalEmail,
    password: values.data.temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: values.data.principalName }
  });
  if (authError || !authData.user) {
    await admin.from("schools").delete().eq("id", data.id);
    return { ok: false, error: authError?.message ?? "Unable to create the principal account.", errors: {} };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    full_name: values.data.principalName,
    email: values.data.principalEmail,
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
    return { ok: false, error: profileError?.message ?? memberError?.message ?? "Unable to provision the principal account.", errors: {} };
  }
  await recordPlatformAudit(actor.id, data.id, "school.created", { name: values.data.name, plan: values.data.subscriptionPlan });
  revalidatePath("/platform", "layout");
  redirect(`/platform/schools/${data.id}`);
}

export async function changeSchoolStatusAction(prevState: any, formData: FormData) {
  const actor = await requirePlatformAdmin();
  const schoolId = z.string().uuid().parse(formData.get("schoolId"));
  const status = z.enum(["active", "suspended", "archived"]).parse(formData.get("status"));
  const reason = z.string().trim().max(500).parse(formData.get("reason") ?? "");
  
  if (status === "suspended" && !reason) {
    return { ok: false, error: "A suspension reason is required.", errors: { reason: ["Reason is required"] } };
  }
  const update = {
    platform_status: status,
    suspended_at: status === "suspended" ? new Date().toISOString() : null,
    suspension_reason: status === "suspended" ? reason : null,
    archived_at: status === "archived" ? new Date().toISOString() : null
  };
  const { error } = await createAdminClient().from("schools").update(update).eq("id", schoolId);
  if (error) {
    return { ok: false, error: error.message, errors: {} };
  }
  await recordPlatformAudit(actor.id, schoolId, `school.${status}`, reason ? { reason } : {});
  revalidatePath("/platform");
  revalidatePath(`/platform/schools/${schoolId}`);
  
  // Return success payload so the form knows it finished
  return { ok: true, error: "", errors: {} };
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
